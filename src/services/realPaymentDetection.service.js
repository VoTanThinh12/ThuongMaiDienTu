const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');

const prisma = new PrismaClient();

class RealPaymentDetectionService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.startDetection();
  }

  // Khởi động hệ thống phát hiện thanh toán thực
  startDetection() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔍 Real Payment Detection Service started');
    
    // Kiểm tra mỗi 5 giây để phát hiện nhanh
    this.checkInterval = setInterval(() => {
      this.checkForRealPayments();
    }, 5000);

    // Cron job để hủy giao dịch hết hạn mỗi 10 giây
    cron.schedule('*/10 * * * * *', () => {
      this.cancelExpiredTransactions();
    });
  }

  // Dừng hệ thống phát hiện
  stopDetection() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Real Payment Detection Service stopped');
  }

  // Kiểm tra thanh toán thực
  async checkForRealPayments() {
    try {
      // 1. Kiểm tra SMS banking (mock)
      await this.checkSMSBanking();
      
      // 2. Kiểm tra Email banking (mock)
      await this.checkEmailBanking();
      
      // 3. Kiểm tra API banking (mock)
      await this.checkAPIBanking();
      
    } catch (error) {
      console.error('Error checking for real payments:', error);
    }
  }

  // Mock SMS Banking - Simulate real SMS from Vietcombank
  async checkSMSBanking() {
    try {
      // 20% chance to simulate real SMS (for testing)
      const hasRealSMS = Math.random() < 0.20;
      if (!hasRealSMS) return;

      // Tìm giao dịch chờ xác nhận
      const pendingTransaction = await prisma.giao_dich_ngan_hang.findFirst({
        where: {
          trang_thai: 'cho_xac_nhan',
          thoi_gian_het_han: {
            gt: new Date()
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
          thoi_gian_tao: 'desc'
        }
      });

      if (!pendingTransaction) return;

      // Simulate SMS content from Vietcombank
      const smsContent = `VCB: +${pendingTransaction.so_tien.toLocaleString()}VND tu 0123456789. So du: 5,000,000VND. ND: ${pendingTransaction.ma_don_hang}. ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`;
      
      console.log('📱 Simulated SMS from Vietcombank:', smsContent);
      
      // Parse SMS và xác nhận thanh toán
      const transactionInfo = this.parseSMSContent(smsContent);
      if (transactionInfo && transactionInfo.orderId === pendingTransaction.ma_don_hang) {
        await this.confirmPayment(pendingTransaction, 'SMS_BANKING');
      }

    } catch (error) {
      console.error('Error checking SMS banking:', error);
    }
  }

  // Mock Email Banking
  async checkEmailBanking() {
    try {
      // 15% chance to simulate real email (for testing)
      const hasRealEmail = Math.random() < 0.15;
      if (!hasRealEmail) return;

      const pendingTransaction = await prisma.giao_dich_ngan_hang.findFirst({
        where: {
          trang_thai: 'cho_xac_nhan',
          thoi_gian_het_han: {
            gt: new Date()
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
          thoi_gian_tao: 'desc'
        }
      });

      if (!pendingTransaction) return;

      // Simulate email content from Vietcombank
      const emailContent = `
        Kính gửi Quý khách,
        
        Tài khoản: 1027077985
        Tên: PHAN HOAI THAN
        
        Giao dịch: +${pendingTransaction.so_tien.toLocaleString()} VND
        Nội dung: ${pendingTransaction.ma_don_hang}
        Thời gian: ${new Date().toLocaleString('vi-VN')}
        Số dư: 5,000,000 VND
      `;
      
      console.log('📧 Simulated Email from Vietcombank:', emailContent);
      
      const transactionInfo = this.parseEmailContent(emailContent);
      if (transactionInfo && transactionInfo.orderId === pendingTransaction.ma_don_hang) {
        await this.confirmPayment(pendingTransaction, 'EMAIL_BANKING');
      }

    } catch (error) {
      console.error('Error checking email banking:', error);
    }
  }

  // Mock API Banking
  async checkAPIBanking() {
    try {
      // 10% chance to simulate real API (for testing)
      const hasRealAPI = Math.random() < 0.10;
      if (!hasRealAPI) return;

      const pendingTransaction = await prisma.giao_dich_ngan_hang.findFirst({
        where: {
          trang_thai: 'cho_xac_nhan',
          thoi_gian_het_han: {
            gt: new Date()
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
          thoi_gian_tao: 'desc'
        }
      });

      if (!pendingTransaction) return;

      // Simulate API response from Vietcombank
      const apiData = {
        id: `api_${Date.now()}`,
        amount: pendingTransaction.so_tien,
        orderId: pendingTransaction.ma_don_hang,
        timestamp: new Date(),
        source: 'vietcombank_api'
      };
      
      console.log('🔌 Simulated API from Vietcombank:', apiData);
      
      if (apiData.orderId === pendingTransaction.ma_don_hang) {
        await this.confirmPayment(pendingTransaction, 'API_BANKING');
      }

    } catch (error) {
      console.error('Error checking API banking:', error);
    }
  }

  // Parse SMS content
  parseSMSContent(content) {
    try {
      const patterns = [
        /VCB:\s*\+?([\d,]+)VND\s+tu\s+\d+\.\s+So du:\s*[\d,]+VND\.\s+ND:\s*([A-Z0-9]+)/i,
        /VCB:\s*\+?([\d,]+)VND\s+tu\s+\d+\.\s+ND:\s*([A-Z0-9]+)\.\s+So du:\s*[\d,]+VND/i,
        /VCB:\s*\+?([\d,]+)VND\s+tu\s+\d+\s+ND:\s*([A-Z0-9]+)/i
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          const amount = parseInt(match[1].replace(/,/g, ''));
          const orderId = match[2];
          
          return {
            amount,
            orderId,
            source: 'sms',
            rawContent: content
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing SMS content:', error);
      return null;
    }
  }

  // Parse email content
  parseEmailContent(content) {
    try {
      const patterns = [
        /Giao dịch:\s*\+?([\d,]+)\s*VND[\s\S]*?Nội dung:\s*([A-Z0-9]+)/i,
        /\+?([\d,]+)\s*VND[\s\S]*?Nội dung:\s*([A-Z0-9]+)/i
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          const amount = parseInt(match[1].replace(/,/g, ''));
          const orderId = match[2];
          
          return {
            amount,
            orderId,
            source: 'email',
            rawContent: content
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing email content:', error);
      return null;
    }
  }

  // Xác nhận thanh toán
  async confirmPayment(transaction, source) {
    try {
      console.log(`🎉 Confirming payment for transaction: ${transaction.ma_giao_dich} from ${source}`);

      // Cập nhật trạng thái giao dịch
      await prisma.giao_dich_ngan_hang.update({
        where: { id: transaction.id },
        data: {
          trang_thai: 'da_xac_nhan',
          nguoi_xac_nhan: `AUTO_${source}`,
          thoi_gian_xac_nhan: new Date()
        }
      });

      // Cập nhật trạng thái đơn hàng
      if (transaction.don_hang) {
        await prisma.don_hang.update({
          where: { id: transaction.don_hang.id },
          data: {
            trang_thai_thanh_toan: true,
            trang_thai: 'da_xac_nhan'
          }
        });
      }

      // Emit Socket.IO event
      if (global.io) {
        global.io.to(`transaction-${transaction.ma_giao_dich}`).emit('payment-success', {
          transactionId: transaction.ma_giao_dich,
          orderId: transaction.ma_don_hang,
          message: 'Thanh toán đã được xác nhận tự động!',
          source: source
        });
        console.log('📡 Socket.IO event emitted for transaction:', transaction.ma_giao_dich);
      }

      console.log('✅ Payment confirmed successfully for:', transaction.ma_giao_dich);
      return true;

    } catch (error) {
      console.error('Error confirming payment:', error);
      return false;
    }
  }

  // Hủy giao dịch hết hạn
  async cancelExpiredTransactions() {
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
        await prisma.giao_dich_ngan_hang.update({
          where: { id: transaction.id },
          data: {
            trang_thai: 'het_han'
          }
        });

        // Emit Socket.IO event
        if (global.io) {
          global.io.to(`transaction-${transaction.ma_giao_dich}`).emit('payment-timeout', {
            transactionId: transaction.ma_giao_dich,
            orderId: transaction.ma_don_hang,
            message: 'Giao dịch đã hết hạn!'
          });
        }

        console.log('⏰ Expired transaction cancelled:', transaction.ma_giao_dich);
      }

    } catch (error) {
      console.error('Error cancelling expired transactions:', error);
    }
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval ? 'active' : 'inactive'
    };
  }
}

module.exports = new RealPaymentDetectionService();
