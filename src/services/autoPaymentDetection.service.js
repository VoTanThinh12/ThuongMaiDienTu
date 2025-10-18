const { PrismaClient } = require('@prisma/client');
const qrPaymentService = require('./qrPayment.service');

const prisma = new PrismaClient();

class AutoPaymentDetectionService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.startTime = Date.now();
    this.startAutoDetection();
  }

  // Khởi động hệ thống tự động phát hiện
  startAutoDetection() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Auto Payment Detection Service started');
    
    // Kiểm tra mỗi 10 giây để phát hiện nhanh hơn
    this.checkInterval = setInterval(() => {
      this.checkForNewTransactions();
    }, 10000);
  }

  // Dừng hệ thống tự động phát hiện
  stopAutoDetection() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Auto Payment Detection Service stopped');
  }

  // Kiểm tra giao dịch mới
  async checkForNewTransactions() {
    try {
      // 1. Kiểm tra SMS banking (nếu có)
      await this.checkSMSBanking();
      
      // 2. Kiểm tra Email banking (nếu có)
      await this.checkEmailBanking();
      
      // 3. Kiểm tra API banking (nếu có)
      await this.checkAPIBanking();
      
    } catch (error) {
      console.error('Error checking for new transactions:', error);
    }
  }

  // Phương pháp 1: SMS Banking Parser
  async checkSMSBanking() {
    try {
      // Đây là nơi bạn sẽ tích hợp với SMS gateway hoặc API SMS
      // Ví dụ: Twilio, Nexmo, hoặc SMS gateway của Việt Nam
      
      // Mock data cho demo - trong thực tế sẽ lấy từ SMS API
      const mockSMSData = await this.getMockSMSData();
      
      for (const sms of mockSMSData) {
        await this.processSMSBanking(sms);
      }
    } catch (error) {
      console.error('Error checking SMS banking:', error);
    }
  }

  // Lấy dữ liệu SMS mẫu (thay thế bằng API thật)
  async getMockSMSData() {
    // Trong thực tế, đây sẽ là API call đến SMS gateway
    // Chỉ trả về dữ liệu khi có giao dịch thực sự
    const hasRealTransaction = Math.random() < 0.1; // 10% chance để test
    
    if (!hasRealTransaction) {
      return []; // Không có giao dịch thật
    }
    
    return [
      {
        id: `sms_${Date.now()}`,
        phoneNumber: '+84901234567',
        content: 'VCB: +500,000VND tu 0123456789. So du: 5,000,000VND. ND: DH0012345678. 01/01/2024 10:30',
        timestamp: new Date(),
        source: 'vietcombank_sms'
      }
    ];
  }

  // Xử lý SMS banking
  async processSMSBanking(sms) {
    try {
      // Parse SMS content để lấy thông tin giao dịch
      const transactionInfo = this.parseSMSContent(sms.content);
      
      if (transactionInfo) {
        console.log('📱 Detected transaction from SMS:', transactionInfo);
        
        // Tìm giao dịch chờ xác nhận
        const pendingTransaction = await this.findPendingTransaction(transactionInfo);
        
        if (pendingTransaction) {
          // Tự động xác nhận giao dịch
          await this.autoConfirmTransaction(pendingTransaction, 'SMS_BANKING');
          console.log('✅ Auto-confirmed transaction:', pendingTransaction.ma_giao_dich);
        }
      }
    } catch (error) {
      console.error('Error processing SMS banking:', error);
    }
  }

  // Parse nội dung SMS để lấy thông tin giao dịch
  parseSMSContent(content) {
    try {
      // Regex patterns cho SMS Vietcombank
      const patterns = [
        // Pattern 1: +500,000VND tu 0123456789. So du: 5,000,000VND. ND: DH0012345678
        /VCB:\s*\+?([\d,]+)VND\s+tu\s+\d+\.\s+So du:\s*[\d,]+VND\.\s+ND:\s*([A-Z0-9]+)/i,
        
        // Pattern 2: +500,000VND tu 0123456789. ND: DH0012345678. So du: 5,000,000VND
        /VCB:\s*\+?([\d,]+)VND\s+tu\s+\d+\.\s+ND:\s*([A-Z0-9]+)\.\s+So du:\s*[\d,]+VND/i,
        
        // Pattern 3: +500,000VND tu 0123456789 ND: DH0012345678
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

  // Phương pháp 2: Email Banking Parser
  async checkEmailBanking() {
    try {
      // Đây là nơi bạn sẽ tích hợp với email service
      // Ví dụ: Gmail API, Outlook API, hoặc IMAP
      
      // Mock data cho demo
      const mockEmailData = await this.getMockEmailData();
      
      for (const email of mockEmailData) {
        await this.processEmailBanking(email);
      }
    } catch (error) {
      console.error('Error checking email banking:', error);
    }
  }

  // Lấy dữ liệu email mẫu
  async getMockEmailData() {
    return [
      {
        id: `email_${Date.now()}`,
        from: 'noreply@vietcombank.com.vn',
        subject: 'Thông báo giao dịch tài khoản',
        content: `
          Kính gửi Quý khách,
          
          Tài khoản: 1027077985
          Tên: PHAN HOAI THAN
          
          Giao dịch: +500,000 VND
          Nội dung: DH0012345678
          Thời gian: 01/01/2024 10:30
          Số dư: 5,000,000 VND
        `,
        timestamp: new Date()
      }
    ];
  }

  // Xử lý email banking
  async processEmailBanking(email) {
    try {
      const transactionInfo = this.parseEmailContent(email.content);
      
      if (transactionInfo) {
        console.log('📧 Detected transaction from email:', transactionInfo);
        
        const pendingTransaction = await this.findPendingTransaction(transactionInfo);
        
        if (pendingTransaction) {
          await this.autoConfirmTransaction(pendingTransaction, 'EMAIL_BANKING');
          console.log('✅ Auto-confirmed transaction:', pendingTransaction.ma_giao_dich);
        }
      }
    } catch (error) {
      console.error('Error processing email banking:', error);
    }
  }

  // Parse nội dung email
  parseEmailContent(content) {
    try {
      // Regex patterns cho email Vietcombank
      const patterns = [
        // Pattern: Giao dịch: +500,000 VND\nNội dung: DH0012345678
        /Giao dịch:\s*\+?([\d,]+)\s*VND[\s\S]*?Nội dung:\s*([A-Z0-9]+)/i,
        
        // Pattern: +500,000 VND\nNội dung: DH0012345678
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

  // Phương pháp 3: API Banking (nếu có)
  async checkAPIBanking() {
    try {
      // Đây là nơi bạn sẽ tích hợp với API banking
      // Ví dụ: Open Banking API, hoặc API từ Vietcombank (nếu có)
      
      // Mock data cho demo
      const mockAPIData = await this.getMockAPIData();
      
      for (const transaction of mockAPIData) {
        await this.processAPIBanking(transaction);
      }
    } catch (error) {
      console.error('Error checking API banking:', error);
    }
  }

  // Lấy dữ liệu API mẫu
  async getMockAPIData() {
    return [
      {
        id: `api_${Date.now()}`,
        amount: 500000,
        orderId: 'DH0012345678',
        timestamp: new Date(),
        source: 'vietcombank_api'
      }
    ];
  }

  // Xử lý API banking
  async processAPIBanking(transaction) {
    try {
      console.log('🔌 Detected transaction from API:', transaction);
      
      const pendingTransaction = await this.findPendingTransaction(transaction);
      
      if (pendingTransaction) {
        await this.autoConfirmTransaction(pendingTransaction, 'API_BANKING');
        console.log('✅ Auto-confirmed transaction:', pendingTransaction.ma_giao_dich);
      }
    } catch (error) {
      console.error('Error processing API banking:', error);
    }
  }

  // Tìm giao dịch chờ xác nhận
  async findPendingTransaction(transactionInfo) {
    try {
      // Tìm giao dịch theo số tiền và mã đơn hàng
      const pendingTransaction = await prisma.giao_dich_ngan_hang.findFirst({
        where: {
          trang_thai: 'cho_xac_nhan',
          so_tien: transactionInfo.amount,
          ma_don_hang: transactionInfo.orderId
        },
        include: {
          don_hang: {
            include: {
              khach_hang: true
            }
          }
        }
      });

      return pendingTransaction;
    } catch (error) {
      console.error('Error finding pending transaction:', error);
      return null;
    }
  }

  // Tự động xác nhận giao dịch
  async autoConfirmTransaction(transaction, source) {
    try {
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

      // Gửi thông báo real-time
      if (global.io) {
        global.io.to(`transaction-${transaction.ma_giao_dich}`).emit('payment-success', {
          transactionId: transaction.ma_giao_dich,
          orderId: transaction.ma_don_hang,
          message: 'Thanh toán đã được xác nhận tự động!',
          source: source
        });
      }

      // Log giao dịch
      console.log(`🎉 Auto-confirmed transaction: ${transaction.ma_giao_dich} from ${source}`);

      return true;
    } catch (error) {
      console.error('Error auto-confirming transaction:', error);
      return false;
    }
  }

  // Thêm giao dịch mẫu để test
  async addMockTransaction() {
    try {
      const mockTransaction = await prisma.giao_dich_ngan_hang.create({
        data: {
          ma_giao_dich: `test_${Date.now()}`,
          ma_don_hang: 'DH0012345678',
          so_tien: 500000,
          ma_xac_minh: '1234567890',
          trang_thai: 'cho_xac_nhan',
          thoi_gian_tao: new Date(),
          thoi_gian_het_han: new Date(Date.now() + 60000),
          noi_dung: 'Test transaction for auto-detection'
        }
      });

      console.log('✅ Added mock transaction:', mockTransaction.ma_giao_dich);
      return mockTransaction;
    } catch (error) {
      console.error('Error adding mock transaction:', error);
      return null;
    }
  }

  // Parse nội dung SMS để lấy thông tin giao dịch (public method)
  parseSMSContent(content) {
    try {
      // Regex patterns cho SMS Vietcombank
      const patterns = [
        // Pattern 1: +500,000VND tu 0123456789. So du: 5,000,000VND. ND: DH0012345678
        /VCB:\s*\+?([\d,]+)VND\s+tu\s+\d+\.\s+So du:\s*[\d,]+VND\.\s+ND:\s*([A-Z0-9]+)/i,
        
        // Pattern 2: +500,000VND tu 0123456789. ND: DH0012345678. So du: 5,000,000VND
        /VCB:\s*\+?([\d,]+)VND\s+tu\s+\d+\.\s+ND:\s*([A-Z0-9]+)\.\s+So du:\s*[\d,]+VND/i,
        
        // Pattern 3: +500,000VND tu 0123456789 ND: DH0012345678
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

  // Parse nội dung email để lấy thông tin giao dịch (public method)
  parseEmailContent(content) {
    try {
      // Regex patterns cho email Vietcombank
      const patterns = [
        // Pattern: Giao dịch: +500,000 VND\nNội dung: DH0012345678
        /Giao dịch:\s*\+?([\d,]+)\s*VND[\s\S]*?Nội dung:\s*([A-Z0-9]+)/i,
        
        // Pattern: +500,000 VND\nNội dung: DH0012345678
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

  // Lấy trạng thái hệ thống
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval ? 'active' : 'inactive',
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }
}

module.exports = new AutoPaymentDetectionService();
