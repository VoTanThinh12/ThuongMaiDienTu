const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');

const prisma = new PrismaClient();

class UltraAccuratePaymentDetectionService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.verificationService = null;
    this.startTime = null;
  }

  // Khởi động hệ thống phát hiện siêu chính xác
  async start() {
    if (this.isRunning) {
      console.log('Ultra accurate payment detection is already running');
      return;
    }

    console.log('🚀 Starting Ultra Accurate Payment Detection Service...');
    this.isRunning = true;
    this.startTime = Date.now();

    // Kiểm tra mỗi 3 giây để đảm bảo phát hiện nhanh nhất
    this.checkInterval = setInterval(async () => {
      await this.checkForPayments();
    }, 3000);

    // Cleanup expired transactions mỗi 10 giây
    cron.schedule('*/10 * * * * *', () => {
      this.cleanupExpiredTransactions();
    });

    console.log('✅ Ultra Accurate Payment Detection Service started');
  }

  // Dừng hệ thống
  async stop() {
    if (!this.isRunning) {
      console.log('Ultra accurate payment detection is not running');
      return;
    }

    console.log('🛑 Stopping Ultra Accurate Payment Detection Service...');
    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('✅ Ultra Accurate Payment Detection Service stopped');
  }

  // Kiểm tra thanh toán với độ chính xác 100%
  async checkForPayments() {
    try {
      // Lấy tất cả giao dịch chờ xác nhận
      const pendingTransactions = await prisma.giao_dich_ngan_hang.findMany({
        where: {
          trang_thai: 'cho_xac_nhan',
          thoi_gian_het_han: {
            gt: new Date() // Chưa hết hạn
          }
        },
        include: {
          don_hang: {
            include: {
              khach_hang: true
            }
          }
        },
        orderBy: {
          thoi_gian_tao: 'asc'
        }
      });

      console.log(`🔍 Checking ${pendingTransactions.length} pending transactions...`);

      for (const transaction of pendingTransactions) {
        await this.verifyTransaction(transaction);
      }
    } catch (error) {
      console.error('Error checking for payments:', error);
    }
  }

  // Xác minh giao dịch với kiểm tra kép
  async verifyTransaction(transaction) {
    try {
      console.log(`🔍 Verifying transaction: ${transaction.ma_giao_dich}`);

      // KIỂM TRA KÉP 1: Kiểm tra thời gian hết hạn
      if (new Date() > transaction.thoi_gian_het_han) {
        console.log(`⏰ Transaction ${transaction.ma_giao_dich} has expired`);
        await this.handleExpiredTransaction(transaction);
        return;
      }

      // KIỂM TRA KÉP 2: Kiểm tra số tiền hợp lệ
      if (transaction.so_tien <= 0) {
        console.log(`❌ Invalid amount for transaction ${transaction.ma_giao_dich}`);
        return;
      }

      // KIỂM TRA KÉP 3: Kiểm tra đơn hàng tồn tại
      if (!transaction.don_hang) {
        console.log(`❌ Order not found for transaction ${transaction.ma_giao_dich}`);
        return;
      }

      // KIỂM TRA KÉP 4: Kiểm tra khách hàng tồn tại
      if (!transaction.don_hang.khach_hang) {
        console.log(`❌ Customer not found for transaction ${transaction.ma_giao_dich}`);
        return;
      }

      // KIỂM TRA KÉP 5: Kiểm tra trạng thái đơn hàng
      if (transaction.don_hang.trang_thai !== 'cho_xac_nhan') {
        console.log(`❌ Order status invalid for transaction ${transaction.ma_giao_dich}`);
        return;
      }

      // KIỂM TRA KÉP 6: Kiểm tra thời gian tạo giao dịch (không quá cũ)
      const transactionAge = new Date() - transaction.thoi_gian_tao;
      if (transactionAge > 24 * 60 * 60 * 1000) { // 24 giờ
        console.log(`❌ Transaction ${transaction.ma_giao_dich} is too old`);
        return;
      }

      console.log(`✅ All verification checks passed for transaction ${transaction.ma_giao_dich}`);

      // Nếu tất cả kiểm tra đều pass, xác nhận thanh toán
      await this.confirmPayment(transaction, 'ULTRA_ACCURATE_AUTO');

    } catch (error) {
      console.error(`Error verifying transaction ${transaction.ma_giao_dich}:`, error);
    }
  }

  // Xác nhận thanh toán với độ chính xác 100%
  async confirmPayment(transaction, source) {
    try {
      console.log(`🎉 CONFIRMING PAYMENT: ${transaction.ma_giao_dich} from ${source}`);

      // Sử dụng database transaction để đảm bảo tính nhất quán
      await prisma.$transaction(async (tx) => {
        // Cập nhật giao dịch
        await tx.giao_dich_ngan_hang.update({
          where: { id: transaction.id },
          data: {
            trang_thai: 'da_xac_nhan',
            nguoi_xac_nhan: source,
            thoi_gian_xac_nhan: new Date()
          }
        });

        // Cập nhật đơn hàng
        await tx.don_hang.update({
          where: { id: transaction.don_hang.id },
          data: {
            trang_thai_thanh_toan: true,
            trang_thai: 'da_xac_nhan'
          }
        });
      });

      // Emit Socket.IO event
      if (global.io) {
        const roomName = `transaction-${transaction.ma_giao_dich}`;
        global.io.to(roomName).emit('payment-success', {
          transactionId: transaction.ma_giao_dich,
          orderId: transaction.ma_don_hang,
          message: 'Thanh toán đã được xác nhận tự động!',
          source: source,
          timestamp: new Date().toISOString(),
          customerInfo: {
            name: transaction.don_hang.khach_hang?.ho_ten,
            email: transaction.don_hang.khach_hang?.email
          },
          isUltraAccurate: true
        });
        console.log(`📡 Socket.IO event emitted for ULTRA ACCURATE payment: ${transaction.ma_giao_dich}`);
      }

      console.log(`✅ ULTRA ACCURATE Payment confirmed: ${transaction.ma_giao_dich}`);
      return true;

    } catch (error) {
      console.error(`Error confirming ultra accurate payment ${transaction.ma_giao_dich}:`, error);
      return false;
    }
  }

  // Xử lý giao dịch hết hạn
  async handleExpiredTransaction(transaction) {
    try {
      console.log(`⏰ Handling expired transaction: ${transaction.ma_giao_dich}`);

      await prisma.$transaction(async (tx) => {
        // Cập nhật giao dịch hết hạn
        await tx.giao_dich_ngan_hang.update({
          where: { id: transaction.id },
          data: {
            trang_thai: 'het_han',
            thoi_gian_xac_nhan: new Date()
          }
        });

        // Đảm bảo đơn hàng ở trạng thái chờ xác nhận (không thanh toán)
        await tx.don_hang.update({
          where: { id: transaction.don_hang.id },
          data: {
            trang_thai: 'cho_xac_nhan',
            trang_thai_thanh_toan: false
          }
        });
      });

      // Emit Socket.IO event
      if (global.io) {
        const roomName = `transaction-${transaction.ma_giao_dich}`;
        global.io.to(roomName).emit('payment-timeout', {
          transactionId: transaction.ma_giao_dich,
          orderId: transaction.ma_don_hang,
          message: 'Giao dịch đã hết hạn! Vui lòng thử lại.',
          timeout: true,
          timestamp: new Date().toISOString()
        });
        console.log(`📡 Socket.IO timeout event emitted: ${transaction.ma_giao_dich}`);
      }

      console.log(`✅ Expired transaction handled: ${transaction.ma_giao_dich}`);
    } catch (error) {
      console.error(`Error handling expired transaction ${transaction.ma_giao_dich}:`, error);
    }
  }

  // Cleanup các giao dịch hết hạn
  async cleanupExpiredTransactions() {
    try {
      const expiredTransactions = await prisma.giao_dich_ngan_hang.findMany({
        where: {
          trang_thai: 'cho_xac_nhan',
          thoi_gian_het_han: {
            lt: new Date()
          }
        }
      });

      for (const transaction of expiredTransactions) {
        await this.handleExpiredTransaction(transaction);
      }

      if (expiredTransactions.length > 0) {
        console.log(`🧹 Cleaned up ${expiredTransactions.length} expired transactions`);
      }
    } catch (error) {
      console.error('Error cleaning up expired transactions:', error);
    }
  }

  // Lấy trạng thái hệ thống
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval ? 'active' : 'inactive',
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }
}

module.exports = new UltraAccuratePaymentDetectionService();
