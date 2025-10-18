const axios = require('axios');
const cron = require('node-cron');
const qrPaymentService = require('./qrPayment.service');

class PaymentStatusChecker {
  constructor() {
    this.isRunning = false;
    this.startStatusChecker();
  }

  // Bắt đầu kiểm tra trạng thái thanh toán tự động
  startStatusChecker() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Kiểm tra mỗi 10 giây
    cron.schedule('*/10 * * * * *', async () => {
      await this.checkAllActiveTransactions();
    });
    
    console.log('Payment status checker started');
  }

  // Kiểm tra tất cả giao dịch đang hoạt động
  async checkAllActiveTransactions() {
    try {
      const activeTransactions = qrPaymentService.getActiveTransactions();
      
      for (const transaction of activeTransactions) {
        await this.checkTransactionStatus(transaction);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  }

  // Kiểm tra trạng thái của một giao dịch cụ thể
  async checkTransactionStatus(transaction) {
    try {
      // Kiểm tra trạng thái trong database
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const order = await prisma.don_hang.findFirst({
        where: { ma_don_hang: transaction.orderId }
      });

      if (order && order.trang_thai_thanh_toan) {
        // Thanh toán thành công
        await this.handlePaymentSuccess(transaction, order);
      } else if (new Date() > transaction.expiresAt) {
        // Giao dịch hết hạn
        await this.handlePaymentTimeout(transaction);
      }
      
      await prisma.$disconnect();
    } catch (error) {
      console.error(`Error checking transaction ${transaction.id}:`, error);
    }
  }

  // Xử lý khi thanh toán thành công
  async handlePaymentSuccess(transaction, order) {
    try {
      // Xóa transaction khỏi active list
      qrPaymentService.activeTransactions.delete(transaction.id);
      
      // Emit Socket.IO event
      if (global.io) {
        global.io.to(`transaction-${transaction.id}`).emit('payment-success', {
          transactionId: transaction.id,
          orderId: transaction.orderId,
          message: 'Thanh toán thành công!',
          order: {
            id: order.id,
            ma_don_hang: order.ma_don_hang,
            tong_tien: order.tong_tien
          }
        });
      }
      
      console.log(`Payment successful for transaction ${transaction.id}`);
    } catch (error) {
      console.error('Error handling payment success:', error);
    }
  }

  // Xử lý khi giao dịch hết hạn
  async handlePaymentTimeout(transaction) {
    try {
      // Xóa transaction khỏi active list
      qrPaymentService.activeTransactions.delete(transaction.id);
      
      // Emit Socket.IO event
      if (global.io) {
        global.io.to(`transaction-${transaction.id}`).emit('payment-timeout', {
          transactionId: transaction.id,
          orderId: transaction.orderId,
          message: 'Giao dịch đã hết hạn!'
        });
      }
      
      console.log(`Payment timeout for transaction ${transaction.id}`);
    } catch (error) {
      console.error('Error handling payment timeout:', error);
    }
  }

  // Kiểm tra trạng thái MoMo qua API (nếu cần)
  async checkMoMoStatus(transaction) {
    try {
      // Chỉ kiểm tra nếu là MoMo transaction
      if (transaction.type !== 'momo') return;
      
      // Có thể gọi API MoMo để kiểm tra trạng thái
      // Tuy nhiên, MoMo thường sử dụng webhook nên không cần thiết
      // Chỉ kiểm tra trong database là đủ
    } catch (error) {
      console.error('Error checking MoMo status:', error);
    }
  }

  // Dừng kiểm tra trạng thái
  stopStatusChecker() {
    this.isRunning = false;
    console.log('Payment status checker stopped');
  }
}

module.exports = new PaymentStatusChecker();



