const QRCode = require("qrcode");
const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const sepayService = require("./sepay.service");

const prisma = new PrismaClient();

class QRPaymentService {
  constructor() {
    this.activeTransactions = new Map();
    this.startCleanupTask();
  }

  // ✅ TÍCH HỢP SEPAY API
  async createBankQRPayment(orderId, amount, orderInfo) {
    try {
      const numericAmount = Math.max(1000, Math.round(Number(amount) || 1000));
      const cleanOrderId = String(orderId).trim();

      // Tạo mã xác minh ngắn gọn
      const verificationCode = this.generateVerificationCode(
        cleanOrderId,
        numericAmount
      );

      // ✅ Nội dung theo format Sepay chuẩn
      const sepayContent = `TT ${cleanOrderId} CODE ${verificationCode}`;

      console.log("📝 Creating Sepay QR with content:", sepayContent);

      // ✅ GỌI SEPAY API thay vì tự tạo VietQR
      const sepayResult = await sepayService.createQRPayment(
        cleanOrderId,
        numericAmount,
        sepayContent
      );

      const transactionId = `bank_${cleanOrderId}_${Date.now()}`;
      const transaction = {
        id: transactionId,
        orderId: cleanOrderId,
        type: "bank",
        amount: numericAmount,
        qrContent: sepayResult.qrUrl, // ✅ QR từ Sepay
        status: "pending",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 300000), // 5 phút
        verificationCode,
        sepayContent: sepayResult.qrContent, // ✅ Nội dung chính xác từ Sepay
        sepayId: sepayResult.sepayId, // ✅ ID từ Sepay để track
      };

      this.activeTransactions.set(transactionId, transaction);

      // ✅ Lưu DB với nội dung chính xác từ Sepay
      await this.saveBankTransactionToDatabase(transaction);

      console.log("✅ Sepay QR Payment Created:", {
        transactionId,
        amount: numericAmount,
        verificationCode,
        sepayContent,
        qrUrl: sepayResult.qrUrl,
      });

      return {
        transactionId,
        qrContent: sepayResult.qrUrl,
        qrCodeDataURL: sepayResult.qrUrl,
        amount: numericAmount,
        expiresAt: transaction.expiresAt,
        verificationCode,
        sepayContent,
        bankInfo: sepayResult.bankInfo,
      };
    } catch (error) {
      console.error("❌ Error creating Sepay QR payment:", error);
      throw new Error("Không thể tạo QR thanh toán Sepay: " + error.message);
    }
  }

  // ✅ Lưu DB với nội dung chính xác từ Sepay
  async saveBankTransactionToDatabase(tx) {
    try {
      console.log("💾 Saving Sepay transaction:", tx.orderId);

      await prisma.giao_dich_ngan_hang.create({
        data: {
          ma_giao_dich: tx.id,
          ma_don_hang: tx.orderId,
          so_tien: tx.amount,
          ma_xac_minh: tx.verificationCode,
          trang_thai: "cho_xac_nhan",
          thoi_gian_tao: tx.createdAt,
          thoi_gian_het_han: tx.expiresAt,
          noi_dung: tx.sepayContent, // ✅ Nội dung chính xác từ Sepay
          ref_gateway: tx.sepayId, // ✅ Sepay ID
        },
      });

      console.log("✅ Sepay transaction saved:", tx.orderId);
    } catch (error) {
      console.error("❌ Save Sepay transaction error:", error);
    }
  }

  generateVerificationCode(orderId, amount) {
    const timestamp = Date.now().toString().slice(-5);
    const amountSuffix = String(amount).slice(-3);
    const orderSuffix = orderId.replace(/\D/g, "").slice(-3);
    return `${orderSuffix}${amountSuffix}${timestamp}`;
  }

  // Các method khác giữ nguyên...
  async verifyBankTransaction(transactionId, verifiedBy) {
    const dbTx = await prisma.giao_dich_ngan_hang.findFirst({
      where: { ma_giao_dich: transactionId, trang_thai: "cho_xac_nhan" },
      include: { don_hang: true },
    });

    if (!dbTx) throw new Error("Transaction not found or already processed");

    await prisma.$transaction(async (tx) => {
      await tx.giao_dich_ngan_hang.update({
        where: { id: dbTx.id },
        data: {
          trang_thai: "da_xac_nhan",
          nguoi_xac_nhan: verifiedBy,
          thoi_gian_xac_nhan: new Date(),
        },
      });

      if (dbTx.don_hang) {
        await tx.don_hang.update({
          where: { id: dbTx.don_hang.id },
          data: {
            trang_thai_thanh_toan: true,
            trang_thai: "da_xac_nhan",
          },
        });
      }
    });

    this.activeTransactions.delete(transactionId);

    if (global.io) {
      console.log("🎉 Emitting payment-success event for:", transactionId);
      global.io.to(`transaction-${transactionId}`).emit("payment-success", {
        transactionId,
        orderId: dbTx.ma_don_hang,
        verifiedBy,
      });
    }

    return true;
  }

  startCleanupTask() {
    cron.schedule("*/5 * * * * *", () => {
      const now = new Date();
      for (const [id, tx] of this.activeTransactions) {
        if (now > tx.expiresAt) this.handleTransactionTimeout(id, tx);
      }
    });
  }

  async handleTransactionTimeout(transactionId, transaction) {
    this.activeTransactions.delete(transactionId);
    await prisma.giao_dich_ngan_hang.updateMany({
      where: { ma_giao_dich: transactionId, trang_thai: "cho_xac_nhan" },
      data: { trang_thai: "het_han", thoi_gian_xac_nhan: new Date() },
    });
    if (global.io) {
      global.io.to(`transaction-${transactionId}`).emit("payment-timeout", {
        transactionId,
        orderId: transaction.orderId,
      });
    }
  }

  async checkPaymentStatus(transactionId) {
    const dbTransaction = await prisma.giao_dich_ngan_hang.findFirst({
      where: { ma_giao_dich: transactionId },
    });
    if (!dbTransaction) return { status: "not_found" };
    if (new Date() > dbTransaction.thoi_gian_het_han)
      return { status: "expired" };
    if (dbTransaction.trang_thai === "da_xac_nhan") return { status: "paid" };

    const order = await prisma.don_hang.findFirst({
      where: { ma_don_hang: dbTransaction.ma_don_hang },
    });
    if (order?.trang_thai_thanh_toan) return { status: "paid" };
    return { status: "pending" };
  }

  getActiveTransactions() {
    return Array.from(this.activeTransactions.values());
  }

  cancelTransaction(id) {
    const t = this.activeTransactions.get(id);
    if (t) {
      this.activeTransactions.delete(id);
      return true;
    }
    return false;
  }
}

module.exports = new QRPaymentService();
