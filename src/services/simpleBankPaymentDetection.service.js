const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');

const prisma = new PrismaClient();

class SimpleBankPaymentDetectionService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
  }

  // Khởi động hệ thống đơn giản
  async start() {
    if (this.isRunning) {
      console.log('Simple bank payment detection is already running');
      return;
    }

    console.log('🚀 Starting SIMPLE Bank Payment Detection...');
    this.isRunning = true;

    // Kiểm tra mỗi 5 giây
    this.checkInterval = setInterval(async () => {
      await this.checkForRealPayments();
    }, 5000);

    console.log('✅ SIMPLE Bank Payment Detection started');
  }

  // Dừng hệ thống
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping SIMPLE Bank Payment Detection...');
    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    console.log('✅ SIMPLE Bank Payment Detection stopped');
  }

  // Kiểm tra thanh toán THẬT
  async checkForRealPayments() {
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
        }
      });

      for (const transaction of pendingTransactions) {
        await this.checkTransaction(transaction);
      }
    } catch (error) {
      console.error('Error checking real payments:', error);
    }
  }

  // Kiểm tra giao dịch cụ thể
  async checkTransaction(transaction) {
    try {
      console.log(`🔍 Checking transaction: ${transaction.ma_giao_dich}`);

      // KIỂM TRA 1: Thời gian hết hạn
      if (new Date() > transaction.thoi_gian_het_han) {
        console.log(`⏰ Transaction ${transaction.ma_giao_dich} expired`);
        await this.handleExpiredTransaction(transaction);
        return;
      }

      // KIỂM TRA 2: Số tiền hợp lệ
      if (transaction.so_tien <= 0) {
        return;
      }

      // KIỂM TRA 3: Đơn hàng tồn tại
      if (!transaction.don_hang) {
        return;
      }

      // KIỂM TRA 4: Khách hàng tồn tại
      if (!transaction.don_hang.khach_hang) {
        return;
      }

      // TẠM THỜI: Giả lập phát hiện thanh toán thành công
      // TRONG THỰC TẾ: Bạn sẽ tích hợp với SMS/Email banking thật
      const shouldConfirm = await this.simulatePaymentDetection(transaction);
      
      if (shouldConfirm) {
        await this.confirmPayment(transaction);
      }

    } catch (error) {
      console.error(`Error checking transaction ${transaction.ma_giao_dich}:`, error);
    }
  }

  // Giả lập phát hiện thanh toán (THAY THẾ BẰNG TÍCH HỢP THẬT)
  async simulatePaymentDetection(transaction) {
    // ĐÂY LÀ NƠI BẠN SẼ TÍCH HỢP VỚI:
    // 1. SMS Banking API
    // 2. Email Banking API  
    // 3. Vietcombank API
    // 4. Hoặc upload sao kê thủ công

    // TẠM THỜI: Giả lập 10% cơ hội phát hiện thanh toán
    const random = Math.random();
    if (random < 0.1) { // 10% cơ hội
      console.log(`🎉 SIMULATED: Payment detected for ${transaction.ma_giao_dich}`);
      return true;
    }

    return false;
  }

  // Xác nhận thanh toán
  async confirmPayment(transaction) {
    try {
      console.log(`✅ CONFIRMING PAYMENT: ${transaction.ma_giao_dich}`);

      // Cập nhật database
      await prisma.$transaction(async (tx) => {
        // Cập nhật giao dịch
        await tx.giao_dich_ngan_hang.update({
          where: { id: transaction.id },
          data: {
            trang_thai: 'da_xac_nhan',
            nguoi_xac_nhan: 'SIMPLE_AUTO_DETECTION',
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

      // Thông báo Socket.IO
      if (global.io) {
        global.io.to(`transaction-${transaction.ma_giao_dich}`).emit('payment-success', {
          transactionId: transaction.ma_giao_dich,
          orderId: transaction.ma_don_hang,
          message: 'Thanh toán thành công! Đơn hàng đã được xác nhận.',
          timestamp: new Date().toISOString(),
          customerInfo: {
            name: transaction.don_hang.khach_hang?.ho_ten,
            email: transaction.don_hang.khach_hang?.email
          }
        });
        console.log(`📡 Socket.IO notification sent for ${transaction.ma_giao_dich}`);
      }

      console.log(`🎉 PAYMENT CONFIRMED: ${transaction.ma_giao_dich}`);
      return true;

    } catch (error) {
      console.error(`Error confirming payment ${transaction.ma_giao_dich}:`, error);
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

        // Đảm bảo đơn hàng ở trạng thái chờ xác nhận
        await tx.don_hang.update({
          where: { id: transaction.don_hang.id },
          data: {
            trang_thai: 'cho_xac_nhan',
            trang_thai_thanh_toan: false
          }
        });
      });

      // Thông báo timeout
      if (global.io) {
        global.io.to(`transaction-${transaction.ma_giao_dich}`).emit('payment-timeout', {
          transactionId: transaction.ma_giao_dich,
          orderId: transaction.ma_don_hang,
          message: 'Giao dịch đã hết hạn! Vui lòng thử lại.',
          timeout: true,
          timestamp: new Date().toISOString()
        });
      }

      console.log(`✅ Expired transaction handled: ${transaction.ma_giao_dich}`);
    } catch (error) {
      console.error(`Error handling expired transaction ${transaction.ma_giao_dich}:`, error);
    }
  }

  // Lấy trạng thái
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval ? 'active' : 'inactive'
    };
  }
}

module.exports = new SimpleBankPaymentDetectionService();


