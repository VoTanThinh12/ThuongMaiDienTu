const QRCode = require('qrcode');
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class QRPaymentService {
  constructor() {
    this.activeTransactions = new Map();
    this.startCleanupTask();
  }
  async createBankQRPayment(orderId, amount, orderInfo) {
    const bankCode = process.env.VIETQR_BANK_CODE || 'MB';
    const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER || '0346176591';
    const accountName = process.env.VIETQR_ACCOUNT_NAME || 'VO TAN THINH';
    const verificationCode = this.generateVerificationCode(orderId, amount);
    const enhancedOrderInfo = `${orderInfo || `Thanh toan don hang ${orderId}`} | Ma: ${verificationCode}`;

    // Always build QR using VietQR image URL
    const vietqrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.jpg?amount=${Math.round(Number(amount))}&addInfo=${encodeURIComponent(enhancedOrderInfo)}`;
    const qrCodeDataURL = await QRCode.toDataURL(vietqrUrl, { width: 300, margin: 2 });

    const transactionId = `bank_${orderId}_${Date.now()}`;
    const transaction = {
      id: transactionId,
      orderId,
      type: 'bank',
      amount,
      qrContent: vietqrUrl,
      qrCodeDataURL,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 300000),
      verificationCode
    };
    this.activeTransactions.set(transactionId, transaction);

    await this.saveBankTransactionToDatabase(transaction);

    return {
      transactionId,
      qrCodeDataURL,
      qrContent: vietqrUrl,
      amount,
      expiresAt: transaction.expiresAt,
      verificationCode,
      bankInfo: { bankCode, accountNumber, accountName }
    };
  }

  async checkPaymentStatus(transactionId) {
    const dbTransaction = await prisma.giao_dich_ngan_hang.findFirst({ where: { ma_giao_dich: transactionId } });
    if (!dbTransaction) return { status: 'not_found' };
    if (new Date() > dbTransaction.thoi_gian_het_han) return { status: 'expired' };
    if (dbTransaction.trang_thai === 'da_xac_nhan') return { status: 'paid' };
    const order = await prisma.don_hang.findFirst({ where: { ma_don_hang: dbTransaction.ma_don_hang } });
    if (order?.trang_thai_thanh_toan) return { status: 'paid' };
    return { status: 'pending' };
  }

  startCleanupTask() {
    cron.schedule('*/5 * * * * *', () => {
      const now = new Date();
      for (const [id, tx] of this.activeTransactions) {
        if (now > tx.expiresAt) this.handleTransactionTimeout(id, tx);
      }
    });
  }

  async handleTransactionTimeout(transactionId, transaction) {
    this.activeTransactions.delete(transactionId);
    await prisma.giao_dich_ngan_hang.updateMany({
      where: { ma_giao_dich: transactionId, trang_thai: 'cho_xac_nhan' },
      data: { trang_thai: 'het_han', thoi_gian_xac_nhan: new Date() }
    });
    if (global.io) {
      global.io.to(`transaction-${transactionId}`).emit('payment-timeout', { transactionId, orderId: transaction.orderId });
    }
  }

  getActiveTransactions() { return Array.from(this.activeTransactions.values()); }
  cancelTransaction(id) { const t = this.activeTransactions.get(id); if (t) { this.activeTransactions.delete(id); return true; } return false; }

  generateVerificationCode(orderId, amount) {
    const timestamp = Date.now().toString().slice(-4);
    const amountCode = Math.round(Number(amount)).toString().slice(-3);
    const orderIdStr = orderId.toString();
    return `${orderIdStr.slice(-4)}${amountCode}${timestamp}`;
  }

  async saveBankTransactionToDatabase(tx) {
    try {
      await prisma.giao_dich_ngan_hang.create({
        data: {
          ma_giao_dich: tx.id,
          ma_don_hang: tx.orderId.toString(),
          so_tien: tx.amount,
          ma_xac_minh: tx.verificationCode,
          trang_thai: 'cho_xac_nhan',
          thoi_gian_tao: tx.createdAt,
          thoi_gian_het_han: tx.expiresAt,
          noi_dung: `Thanh toan don hang ${tx.orderId} | Ma: ${tx.verificationCode}`
        }
      });
    } catch (e) { console.error('save tx error', e); }
  }

  async verifyBankTransaction(transactionId, verifiedBy) {
    const dbTx = await prisma.giao_dich_ngan_hang.findFirst({
      where: { ma_giao_dich: transactionId, trang_thai: 'cho_xac_nhan' },
      include: { don_hang: true }
    });
    if (!dbTx) throw new Error('Transaction not found or processed');

    await prisma.$transaction(async (tx) => {
      await tx.giao_dich_ngan_hang.update({ where: { id: dbTx.id }, data: { trang_thai: 'da_xac_nhan', nguoi_xac_nhan: verifiedBy, thoi_gian_xac_nhan: new Date() } });
      if (dbTx.don_hang) {
        await tx.don_hang.update({ where: { id: dbTx.don_hang.id }, data: { trang_thai_thanh_toan: true, trang_thai: 'da_xac_nhan' } });
      }
    });

    this.activeTransactions.delete(transactionId);
    if (global.io) {
      global.io.to(`transaction-${transactionId}`).emit('payment-success', { transactionId, orderId: dbTx.ma_don_hang, verifiedBy });
    }
    return true;
  }
}

module.exports = new QRPaymentService();
