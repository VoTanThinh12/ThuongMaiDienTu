const QRCode = require("qrcode");
const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class QRPaymentService {
  constructor() {
    this.activeTransactions = new Map();
    this.startCleanupTask();
  }

  // ✅ HYBRID: Tự tạo QR nhưng theo format Sepay để webhook khớp
  async createBankQRPayment(orderId, amount, orderInfo) {
    try {
      const bankCode = "MB";
      const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER || "0346176591";
      const accountName = process.env.VIETQR_ACCOUNT_NAME || "VO TAN THINH";

      const numericAmount = Math.max(1000, Math.round(Number(amount) || 1000));
      const cleanOrderId = String(orderId).trim();

      // ✅ Tạo mã xác minh theo CHUẨN SEPAY (11 số)
      const verificationCode = this.generateSepayVerificationCode();

      // ✅ Nội dung theo format Sepay chuẩn
      const sepayContent = `TT ${cleanOrderId} CODE ${verificationCode}`;

      // ✅ Tạo VietQR với nội dung Sepay format
      const vietqrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.jpg?amount=${numericAmount}&addInfo=${encodeURIComponent(
        sepayContent
      )}&accountName=${encodeURIComponent(accountName)}`;

      console.log("🔗 VietQR URL Generated:", vietqrUrl);
      console.log("📝 Sepay-compatible content:", sepayContent);

      const transactionId = `bank_${cleanOrderId}_${Date.now()}`;
      const transaction = {
        id: transactionId,
        orderId: cleanOrderId,
        type: "bank",
        amount: numericAmount,
        qrContent: vietqrUrl,
        status: "pending",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 300000), // 5 phút
        verificationCode,
        sepayContent: sepayContent, // ✅ Lưu content để webhook match
      };

      this.activeTransactions.set(transactionId, transaction);

      // ✅ Lưu DB với content Sepay-compatible
      await this.saveBankTransactionToDatabase(transaction);

      console.log("✅ Bank QR Payment Created (Sepay-compatible):", {
        transactionId,
        amount: numericAmount,
        verificationCode,
        sepayContent,
      });

      return {
        transactionId,
        qrContent: vietqrUrl,
        qrCodeDataURL: vietqrUrl,
        amount: numericAmount,
        expiresAt: transaction.expiresAt,
        verificationCode,
        sepayContent,
        bankInfo: {
          bankCode,
          accountNumber,
          accountName,
          bankName: "MB Bank",
        },
      };
    } catch (error) {
      console.error("❌ Error creating QR payment:", error);
      throw new Error("Không thể tạo QR thanh toán: " + error.message);
    }
  }

  // ✅ Tạo mã xác minh 11 số như Sepay
  generateSepayVerificationCode() {
    // Format: XXXXXXXXXXXXX (11 số giống Sepay)
    const timestamp = Date.now().toString(); // Full timestamp
    const randomPart = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return timestamp.slice(-8) + randomPart; // 8 số cuối timestamp + 3 số random
  }

  // ✅ Lưu với content chính xác
  async saveBankTransactionToDatabase(tx) {
    try {
      console.log("💾 Saving transaction for orderId:", tx.orderId);

      // Tìm đơn hàng theo ma_don_hang
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

      // ✅ Lưu với nội dung Sepay-compatible
      await prisma.giao_dich_ngan_hang.create({
        data: {
          ma_giao_dich: tx.id,
          ma_don_hang: tx.orderId, // ✅ Chính xác orderId
          so_tien: tx.amount,
          ma_xac_minh: tx.verificationCode, // ✅ Mã 11 số như Sepay
          trang_thai: "cho_xac_nhan",
          thoi_gian_tao: tx.createdAt,
          thoi_gian_het_han: tx.expiresAt,
          noi_dung: tx.sepayContent, // ✅ Nội dung khớp với QR
        },
      });

      console.log(
        "✅ Transaction saved with Sepay-compatible content:",
        tx.sepayContent
      );
    } catch (error) {
      console.error("❌ Save transaction error:", error);
    }
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

  // Các method khác giữ nguyên
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
