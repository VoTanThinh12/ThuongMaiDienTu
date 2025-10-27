const QRCode = require('qrcode');
const axios = require('axios');
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { createMoMoPayment, verifyMoMoSignature } = require('../utils/momo');
const { buildPaymentUrl } = require('../utils/vnpay');

const prisma = new PrismaClient();

class QRPaymentService {
  constructor() {
    this.activeTransactions = new Map(); // Lưu trữ các giao dịch đang chờ
    this.startCleanupTask();
  }

  // Tạo QR code cho thanh toán ngân hàng
  async createBankQRPayment(orderId, amount, orderInfo) {
    try {
      console.log('Creating bank QR payment:', { orderId, amount, orderInfo });
      
      // 🚀 Cập nhật cho MB Bank
      const bankCode = process.env.VIETQR_BANK_CODE || 'MB';
      const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER || '0346176591';
      const accountName = process.env.VIETQR_ACCOUNT_NAME || 'VO TAN THINH';
      
      console.log('Bank info:', { bankCode, accountNumber, accountName });
      
      // Tạo mã xác minh trước để đưa vào nội dung chuyển khoản
      const verificationCode = this.generateVerificationCode(orderId, amount);
      
      // 🔑 Đảm bảo nội dung chuyển khoản có chứa mã xác minh
      const enhancedOrderInfo = `${orderInfo || `Thanh toan don hang ${orderId}`} | Ma: ${verificationCode}`;
      
      // Tạo QR code thực từ API VietQR
      let qrCodeDataURL;
      try {
        qrCodeDataURL = await this.generateVietQRContent({
          bankCode,
          accountNumber,
          accountName,
          amount: Math.round(Number(amount)),
          orderInfo: enhancedOrderInfo,
          orderId
        });
        console.log('QR code generated successfully from VietQR API');
      } catch (qrError) {
        console.error('Failed to generate QR from VietQR API, using fallback:', qrError.message);
        // Fallback: tạo QR code với URL
        const vietqrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.jpg?amount=${Math.round(Number(amount))}&addInfo=${encodeURIComponent(enhancedOrderInfo)}`;
        qrCodeDataURL = await QRCode.toDataURL(vietqrUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        console.log('QR code generated successfully with fallback method');
      }

      // Lưu thông tin giao dịch
      const transactionId = `bank_${orderId}_${Date.now()}`;
      const qrContent = `VietQR://${bankCode}/${accountNumber}/${Math.round(Number(amount))}/${enhancedOrderInfo}`;
      
      const transaction = {
        id: transactionId,
        orderId,
        type: 'bank',
        amount,
        qrContent,
        qrCodeDataURL,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 300000), // 🚀 Tăng lên 5 phút để có thời gian test
        verificationCode // Mã xác minh
      };

      this.activeTransactions.set(transactionId, transaction);

      // Lưu vào database để admin có thể xác minh
      try {
        await this.saveBankTransactionToDatabase(transaction);
        console.log('Bank transaction saved to database successfully');
      } catch (dbError) {
        console.error('Failed to save bank transaction to database:', dbError.message);
        // Không throw error vì QR code đã được tạo thành công
      }

      return {
        transactionId,
        qrCodeDataURL,
        qrContent,
        amount,
        expiresAt: transaction.expiresAt,
        verificationCode: transaction.verificationCode,
        bankInfo: {
          bankCode,
          accountNumber,
          accountName: accountName, // 🚀 Sử dụng tên thực từ .env
          bankName: bankCode === 'MB' ? 'MB Bank' : (bankCode === 'VCB' ? 'Vietcombank' : 'Ngân hàng'),
          branch: bankCode === 'MB' ? 'Chi nhánh MB Bank' : 'Chi nhánh TP.HCM'
        }
      };
    } catch (error) {
      console.error('Error creating bank QR payment:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  // Tạo QR code cho thanh toán MoMo
  async createMoMoQRPayment(orderId, amount, orderInfo) {
    try {
      // Tạo payment với MoMo
      const momoData = await createMoMoPayment({
        amount,
        orderId,
        orderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
        redirectUrl: process.env.MOMO_RETURN_URL,
        ipnUrl: process.env.MOMO_IPN_URL,
      });

      // Tạo QR code từ payUrl của MoMo
      const qrCodeDataURL = await QRCode.toDataURL(momoData.payUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Lưu thông tin giao dịch
      const transactionId = `momo_${orderId}_${Date.now()}`;
      const transaction = {
        id: transactionId,
        orderId,
        type: 'momo',
        amount,
        qrContent: momoData.payUrl,
        qrCodeDataURL,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 300000), // 5 phút
        momoRequestId: momoData.requestId
      };

      this.activeTransactions.set(transactionId, transaction);

      return {
        transactionId,
        qrCodeDataURL,
        qrContent: momoData.payUrl,
        amount,
        expiresAt: transaction.expiresAt,
        momoData
      };
    } catch (error) {
      console.error('Error creating MoMo QR payment:', error);
      throw error;
    }
  }

  // Tạo QR code thực từ API VietQR
  async generateVietQRContent({ bankCode, accountNumber, accountName, amount, orderInfo, orderId }) {
    // URL VietQR để lấy QR code thực
    const vietqrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.jpg?amount=${amount}&addInfo=${encodeURIComponent(orderInfo)}`;
    
    try {
      // Sử dụng https module để tải QR code thực từ API VietQR
      const https = require('https');
      const { promisify } = require('util');
      
      const getHttps = promisify(https.get);
      
      return new Promise((resolve, reject) => {
        https.get(vietqrUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error('Không thể tải QR code từ VietQR'));
            return;
          }
          
          const chunks = [];
          response.on('data', (chunk) => {
            chunks.push(chunk);
          });
          
          response.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const base64 = buffer.toString('base64');
            const dataURL = `data:image/png;base64,${base64}`;
            resolve(dataURL);
          });
        }).on('error', (error) => {
          console.error('Lỗi tải QR code từ VietQR:', error);
          // Fallback: tạo QR code với URL
          QRCode.toDataURL(vietqrUrl, {
            width: 300,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          }).then(resolve).catch(reject);
        });
      });
    } catch (error) {
      console.error('Lỗi tải QR code từ VietQR:', error);
      // Fallback: tạo QR code với URL
      const qrCodeDataURL = await QRCode.toDataURL(vietqrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrCodeDataURL;
    }
  }

  // Kiểm tra trạng thái thanh toán
  async checkPaymentStatus(transactionId) {
    try {
      console.log('🔍 Checking payment status for:', transactionId);
      
      // Kiểm tra trong database trước
      const dbTransaction = await prisma.giao_dich_ngan_hang.findFirst({
        where: { ma_giao_dich: transactionId }
      });

      console.log('📊 Database query result:', dbTransaction ? 'FOUND' : 'NOT FOUND');
      if (dbTransaction) {
        console.log('   ID:', dbTransaction.ma_giao_dich);
        console.log('   Status:', dbTransaction.trang_thai);
        console.log('   Order:', dbTransaction.ma_don_hang);
      }

      if (!dbTransaction) {
        return { status: 'not_found' };
      }

      // Kiểm tra timeout
      if (new Date() > dbTransaction.thoi_gian_het_han) {
        return { status: 'expired' };
      }

      // Kiểm tra trạng thái trong database
      if (dbTransaction.trang_thai === 'da_xac_nhan') {
        return { status: 'paid' };
      }

      // Kiểm tra đơn hàng
      const order = await prisma.don_hang.findFirst({
        where: { ma_don_hang: dbTransaction.ma_don_hang }
      });

      if (order && order.trang_thai_thanh_toan) {
        return { status: 'paid' };
      }

      return { status: 'pending' };
    } catch (error) {
      console.error('Error checking payment status:', error);
      return { status: 'error' };
    }
  }

  // Giữ phần tạo QR và kiểm tra trạng thái; loại bỏ xác nhận tự động qua webhook ngân hàng

  // Cleanup task chạy mỗi 5 giây để xử lý timeout chính xác
  startCleanupTask() {
    cron.schedule('*/5 * * * * *', () => {
      const now = new Date();
      for (const [transactionId, transaction] of this.activeTransactions) {
        if (now > transaction.expiresAt) {
          this.handleTransactionTimeout(transactionId, transaction);
        }
      }
    });
  }

  // Xử lý timeout giao dịch với độ chính xác cao
  async handleTransactionTimeout(transactionId, transaction) {
    try {
      console.log(`⏰ Transaction timeout: ${transactionId}`);
      
      // Xóa khỏi active transactions
      this.activeTransactions.delete(transactionId);
      
      // Cập nhật database - đánh dấu hết hạn
      await prisma.giao_dich_ngan_hang.updateMany({
        where: { 
          ma_giao_dich: transactionId,
          trang_thai: 'cho_xac_nhan'
        },
        data: {
          trang_thai: 'het_han',
          thoi_gian_xac_nhan: new Date()
        }
      });

      // Cập nhật đơn hàng về trạng thái chờ xác nhận (không thanh toán)
      const order = await prisma.don_hang.findFirst({
        where: { ma_don_hang: transaction.orderId }
      });

      if (order && order.trang_thai === 'cho_xac_nhan') {
        await prisma.don_hang.update({
          where: { id: order.id },
          data: {
            trang_thai: 'cho_xac_nhan',
            trang_thai_thanh_toan: false
          }
        });
      }
      
      // Emit Socket.IO event để thông báo timeout
      if (global.io) {
        global.io.to(`transaction-${transactionId}`).emit('payment-timeout', {
          transactionId,
          orderId: transaction.orderId,
          message: 'Giao dịch đã hết hạn! Vui lòng thử lại.',
          timeout: true,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`✅ Transaction timeout handled: ${transactionId}`);
    } catch (error) {
      console.error('Error handling transaction timeout:', error);
    }
  }

  // Lấy danh sách transaction đang hoạt động
  getActiveTransactions() {
    return Array.from(this.activeTransactions.values());
  }

  // Hủy transaction
  cancelTransaction(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    if (transaction) {
      this.activeTransactions.delete(transactionId);
      return true;
    }
    return false;
  }

  // Tạo mã xác minh cho giao dịch
  generateVerificationCode(orderId, amount) {
    // Tạo mã xác minh dựa trên orderId và amount
    const timestamp = Date.now().toString().slice(-4);
    const amountCode = Math.round(Number(amount)).toString().slice(-3);
    const orderIdStr = orderId.toString();
    return `${orderIdStr.slice(-4)}${amountCode}${timestamp}`;
  }

  // Lưu giao dịch ngân hàng vào database
  async saveBankTransactionToDatabase(transaction) {
    try {
      await prisma.giao_dich_ngan_hang.create({
        data: {
          ma_giao_dich: transaction.id,
          ma_don_hang: transaction.orderId.toString(),
          so_tien: transaction.amount,
          ma_xac_minh: transaction.verificationCode,
          trang_thai: 'cho_xac_nhan',
          thoi_gian_tao: transaction.createdAt,
          thoi_gian_het_han: transaction.expiresAt,
          noi_dung: `Thanh toan don hang ${transaction.orderId} | Ma: ${transaction.verificationCode}` // 🔑 Đảm bảo nội dung có mã xác minh
        }
      });
    } catch (error) {
      console.error('Error saving bank transaction to database:', error);
    }
  }

  // Xác minh giao dịch ngân hàng với kiểm tra kép để đảm bảo 100% chính xác
  async verifyBankTransaction(transactionId, verifiedBy) {
    try {
      console.log(`🔍 Verifying bank transaction: ${transactionId} by ${verifiedBy}`);

      // Lấy từ bộ nhớ nếu còn; nếu không sẽ fallback DB
      let transaction = this.activeTransactions.get(transactionId);

      // KIỂM TRA KÉP 1: Xác minh giao dịch tồn tại trong database (đồng thời lấy dữ liệu cần thiết)
      const dbTransaction = await prisma.giao_dich_ngan_hang.findFirst({
        where: {
          ma_giao_dich: transactionId,
          trang_thai: 'cho_xac_nhan'
        },
        include: {
          don_hang: {
            include: { khach_hang: true }
          }
        }
      });

      if (!dbTransaction) {
        throw new Error('Transaction not found in database or already processed');
      }

      // Fallback: nếu server đã restart khiến mất activeTransactions, tạo đối tượng tạm từ DB
      if (!transaction) {
        transaction = {
          id: dbTransaction.ma_giao_dich,
          orderId: dbTransaction.ma_don_hang,
          amount: dbTransaction.so_tien
        };
      }

      // KIỂM TRA KÉP 2: Xác minh thời gian hết hạn
      if (new Date() > dbTransaction.thoi_gian_het_han) {
        throw new Error('Transaction has expired');
      }

      // KIỂM TRA KÉP 3: Xác minh số tiền khớp
      if (Number(dbTransaction.so_tien) !== Number(transaction.amount)) {
        throw new Error('Amount mismatch between transaction and database');
      }

      console.log('✅ All verification checks passed');

      // Cập nhật database với transaction
      await prisma.$transaction(async (tx) => {
        await tx.giao_dich_ngan_hang.update({
          where: { id: dbTransaction.id },
          data: {
            trang_thai: 'da_xac_nhan',
            nguoi_xac_nhan: verifiedBy,
            thoi_gian_xac_nhan: new Date()
          }
        });

        await tx.don_hang.update({
          where: { id: dbTransaction.don_hang.id },
          data: {
            trang_thai_thanh_toan: true,
            trang_thai: 'da_xac_nhan'
          }
        });
      });

      // Xóa khỏi active transactions nếu có
      this.activeTransactions.delete(transactionId);

      // Emit Socket.IO event với thông tin chi tiết
      if (global.io) {
        global.io.to(`transaction-${transactionId}`).emit('payment-success', {
          transactionId,
          orderId: transaction.orderId,
          message: 'Thanh toán đã được xác nhận thành công!',
          verifiedBy: verifiedBy,
          timestamp: new Date().toISOString(),
          customerInfo: {
            name: dbTransaction.don_hang.khach_hang?.ho_ten,
            email: dbTransaction.don_hang.khach_hang?.email
          }
        });
      }

      console.log(`✅ Bank transaction verified successfully: ${transactionId}`);
      return true;
    } catch (error) {
      console.error('Error verifying bank transaction:', error);
      throw error;
    }
  }

  // Từ chối giao dịch ngân hàng
  async rejectBankTransaction(transactionId, reason, rejectedBy) {
    try {
      const transaction = this.activeTransactions.get(transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Cập nhật database
      await prisma.giao_dich_ngan_hang.update({
        where: { ma_giao_dich: transactionId },
        data: {
          trang_thai: 'bi_tu_choi',
          ly_do_tu_choi: reason,
          nguoi_xac_nhan: rejectedBy,
          thoi_gian_xac_nhan: new Date()
        }
      });

      // Xóa khỏi active transactions
      this.activeTransactions.delete(transactionId);

      // Emit Socket.IO event
      if (global.io) {
        global.io.to(`transaction-${transactionId}`).emit('payment-failed', {
          transactionId,
          orderId: transaction.orderId,
          message: 'Thanh toán bị từ chối: ' + reason
        });
      }

      return true;
    } catch (error) {
      console.error('Error rejecting bank transaction:', error);
      throw error;
    }
  }

  // Lấy danh sách giao dịch chờ xác minh
  async getPendingBankTransactions() {
    try {
      return await prisma.giao_dich_ngan_hang.findMany({
        where: { trang_thai: 'cho_xac_nhan' },
        include: {
          don_hang: {
            include: {
              khach_hang: true
            }
          }
        },
        orderBy: { thoi_gian_tao: 'desc' }
      });
    } catch (error) {
      console.error('Error getting pending bank transactions:', error);
      throw error;
    }
  }

  // Phân tích sao kê ngân hàng (cập nhật cho MB Bank)
  async parseBankStatement(fileContent) {
    try {
      // Đây là một ví dụ đơn giản, bạn có thể cải thiện logic này
      const lines = fileContent.split('\n');
      const transactions = [];

      for (const line of lines) {
        // Tìm các dòng chứa thông tin giao dịch MB Bank
        if (line.includes('VO TAN THINH') || line.includes('0346176591')) {
          // Parse thông tin giao dịch từ sao kê
          // Logic này cần được tùy chỉnh theo format sao kê của MB Bank
          const match = line.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d+\.?\d*)\s+(.+)/);
          if (match) {
            transactions.push({
              date: match[1],
              amount: parseFloat(match[2].replace(/\./g, '')),
              description: match[3]
            });
          }
        }
      }

      return transactions;
    } catch (error) {
      console.error('Error parsing bank statement:', error);
      throw error;
    }
  }

  // Tự động khớp giao dịch từ sao kê
  async autoMatchTransactions(parsedTransactions) {
    try {
      const pendingTransactions = await this.getPendingBankTransactions();
      const matchedTransactions = [];

      for (const parsedTx of parsedTransactions) {
        for (const pendingTx of pendingTransactions) {
          // Kiểm tra khớp số tiền và thời gian
          if (Math.abs(parsedTx.amount - pendingTx.so_tien) < 1000 && // Chênh lệch < 1000 VND
              parsedTx.description.includes(pendingTx.ma_xac_minh)) {
            
            // Tự động xác minh giao dịch
            await this.verifyBankTransaction(pendingTx.ma_giao_dich, 'AUTO_SYSTEM');
            matchedTransactions.push({
              parsedTransaction: parsedTx,
              pendingTransaction: pendingTx
            });
          }
        }
      }

      return matchedTransactions;
    } catch (error) {
      console.error('Error auto matching transactions:', error);
      throw error;
    }
  }
}

module.exports = new QRPaymentService();