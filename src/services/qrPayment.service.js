const QRCode = require("qrcode");
const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class QRPaymentService {
  constructor() {
    this.activeTransactions = new Map();
    this.startCleanupTask();
  }

  // ✅ DÙNG SEPAY QR GENERATOR + Format chuẩn
  async createBankQRPayment(orderId, amount, orderInfo) {
    try {
      const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER || "0346176591";
      const accountName = process.env.VIETQR_ACCOUNT_NAME || "VO TAN THINH";
      const bankCode = "MB";

      const numericAmount = Math.max(1000, Math.round(Number(amount) || 1000));
      const cleanOrderId = String(orderId).trim();

      // ✅ Tạo nội dung theo format Sepay chuẩn (ngắn gọn để tránh bị cắt)
      const sepayContent = `DH${cleanOrderId.replace(
        "DH",
        ""
      )} - ${numericAmount}d`;

      // ✅ DÙNG SEPAY QR GENERATOR thay vì VietQR
      const sepayQrUrl = `https://qr.sepay.vn/img?acc=${accountNumber}&bank=${bankCode}&amount=${numericAmount}&des=${encodeURIComponent(
        sepayContent
      )}`;

      console.log("🔗 Sepay QR URL Generated:", sepayQrUrl);
      console.log("📝 Sepay content:", sepayContent);

      const transactionId = `bank_${cleanOrderId}_${Date.now()}`;
      const transaction = {
        id: transactionId,
        orderId: cleanOrderId,
        type: "bank",
        amount: numericAmount,
        qrContent: sepayQrUrl, // ✅ QR từ Sepay generator
        status: "pending",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 300000), // 5 phút
        sepayContent: sepayContent, // ✅ Nội dung sẽ xuất hiện trong webhook
      };

      this.activeTransactions.set(transactionId, transaction);
      await this.saveBankTransactionToDatabase(transaction);

      console.log("✅ Sepay QR Payment Created:", {
        transactionId,
        amount: numericAmount,
        sepayContent,
      });

      return {
        transactionId,
        qrContent: sepayQrUrl,
        qrCodeDataURL: sepayQrUrl,
        amount: numericAmount,
        expiresAt: transaction.expiresAt,
        sepayContent,
        bankInfo: {
          bankCode,
          accountNumber,
          accountName,
          bankName: "MB Bank",
        },
      };
    } catch (error) {
      console.error("❌ Error creating Sepay QR payment:", error);
      throw new Error("Không thể tạo QR thanh toán: " + error.message);
    }
  }

  // ✅ Lưu với nội dung Sepay sẽ gửi qua webhook
  async saveBankTransactionToDatabase(tx) {
    try {
      console.log("💾 Saving transaction for orderId:", tx.orderId);

      await prisma.giao_dich_ngan_hang.create({
        data: {
          ma_giao_dich: tx.id,
          ma_don_hang: tx.orderId,
          so_tien: tx.amount,
          ma_xac_minh: tx.orderId, // ✅ Dùng orderId làm mã xác minh để dễ match
          trang_thai: "cho_xac_nhan",
          thoi_gian_tao: tx.createdAt,
          thoi_gian_het_han: tx.expiresAt,
          noi_dung: tx.sepayContent, // ✅ Nội dung Sepay sẽ webhook về
        },
      });

      console.log("✅ Transaction saved with Sepay content:", tx.sepayContent);
    } catch (error) {
      console.error("❌ Save transaction error:", error);
    }
  }

  // Các method khác giữ nguyên...
  async verifyBankTransaction(transactionId, verifiedBy) {
    const dbTx = await prisma.giao_dich_ngan_hang.findFirst({
      where: { ma_giao_dich: transactionId, trang_thai: "cho_xac_nhan" },
      include: { don_hang: true },
    });

    if (!dbTx) throw new Error("Transaction not found");

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
          data: { trang_thai_thanh_toan: true, trang_thai: "da_xac_nhan" },
        });
      }
    });

    this.activeTransactions.delete(transactionId);

    if (global.io) {
      console.log("🎉 Emitting payment-success event");
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
  }

  async checkPaymentStatus(transactionId) {
    const dbTransaction = await prisma.giao_dich_ngan_hang.findFirst({
      where: { ma_giao_dich: transactionId },
    });
    if (!dbTransaction) return { status: "not_found" };
    if (new Date() > dbTransaction.thoi_gian_het_han)
      return { status: "expired" };
    if (dbTransaction.trang_thai === "da_xac_nhan") return { status: "paid" };
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
