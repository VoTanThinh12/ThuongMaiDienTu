const QRCode = require("qrcode");
const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class QRPaymentService {
  constructor() {
    this.activeTransactions = new Map();
    this.startCleanupTask();
  }

  async createBankQRPayment(orderId, amount, orderInfo) {
    try {
      const bankCode = "MB";
      const accountNumber = "0346176591";
      const accountName = "VO TAN THINH";

      const numericAmount = Math.max(1000, Math.round(Number(amount) || 1000));

      // ✅ FIX: Dùng CHÍNH XÁC orderId từ database (ma_don_hang)
      // Không tự tạo hoặc biến đổi gì cả
      const cleanOrderId = String(orderId).trim();

      // ✅ FIX: Tạo verificationCode ngắn gọn, dễ nhớ
      const verificationCode = this.generateVerificationCode(
        cleanOrderId,
        numericAmount
      );

      // ✅ FIX: Nội dung chuyển khoản CHUẨN - đây sẽ là nội dung hiện trên QR
      const addInfo = `TT ${cleanOrderId} CODE ${verificationCode}`;

      const vietqrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.jpg?amount=${numericAmount}&addInfo=${encodeURIComponent(
        addInfo
      )}&accountName=${encodeURIComponent(accountName)}`;

      console.log("🔗 VietQR URL Generated:", vietqrUrl);
      console.log("📝 QR Content:", addInfo);

      const transactionId = `bank_${cleanOrderId}_${Date.now()}`;
      const transaction = {
        id: transactionId,
        orderId: cleanOrderId, // ✅ FIX: Lưu CHÍNH XÁC orderId
        type: "bank",
        amount: numericAmount,
        qrContent: vietqrUrl,
        status: "pending",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 300000), // 5 phút
        verificationCode,
        addInfo: addInfo, // ✅ FIX: Lưu nội dung chuyển khoản chính xác
      };

      this.activeTransactions.set(transactionId, transaction);
      await this.saveBankTransactionToDatabase(transaction);

      console.log("✅ Bank QR Payment Created:", {
        transactionId,
        amount: numericAmount,
        verificationCode,
        addInfo,
      });

      return {
        transactionId,
        qrContent: vietqrUrl,
        qrCodeDataURL: vietqrUrl,
        amount: numericAmount,
        expiresAt: transaction.expiresAt,
        verificationCode,
        addInfo,
        bankInfo: { bankCode, accountNumber, accountName },
      };
    } catch (error) {
      console.error("❌ Error creating bank QR payment:", error);
      throw new Error("Không thể tạo QR thanh toán: " + error.message);
    }
  }

  // ✅ FIX: Lưu database với ĐÚNG ma_don_hang và ma_xac_minh
  async saveBankTransactionToDatabase(tx) {
    try {
      console.log("💾 Saving transaction for orderId:", tx.orderId);

      // Tìm đơn hàng theo ma_don_hang CHÍNH XÁC
      const existingOrder = await prisma.don_hang.findFirst({
        where: { ma_don_hang: tx.orderId },
      });

      if (!existingOrder) {
        console.warn("⚠️ Order not found:", tx.orderId);
        return;
      }

      console.log(
        "🔍 Order search result:",
        `Found: ${existingOrder.ma_don_hang}`
      );

      // ✅ FIX: Lưu với CHÍNH XÁC ma_don_hang và ma_xac_minh từ transaction
      await prisma.giao_dich_ngan_hang.create({
        data: {
          ma_giao_dich: tx.id,
          ma_don_hang: tx.orderId, // ✅ Chính xác orderId
          so_tien: tx.amount,
          ma_xac_minh: tx.verificationCode, // ✅ Chính xác verificationCode
          trang_thai: "cho_xac_nhan",
          thoi_gian_tao: tx.createdAt,
          thoi_gian_het_han: tx.expiresAt,
          noi_dung: tx.addInfo, // ✅ Chính xác nội dung QR
        },
      });

      console.log("✅ Transaction saved for order:", tx.orderId);
    } catch (error) {
      console.error("❌ Save transaction error:", error);
    }
  }

  // ✅ FIX: Tạo mã xác minh ngắn gọn hơn (10-11 ký tự)
  generateVerificationCode(orderId, amount) {
    const timestamp = Date.now().toString().slice(-5); // 5 số cuối timestamp
    const amountSuffix = String(amount).slice(-3); // 3 số cuối amount
    const orderSuffix = orderId.replace(/\D/g, "").slice(-3); // 3 số cuối orderId
    return `${orderSuffix}${amountSuffix}${timestamp}`;
  }

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

    // ✅ FIX: Phát sự kiện socket payment-success
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

  // Các method khác giữ nguyên...
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
