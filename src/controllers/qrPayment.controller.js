const { PrismaClient } = require('@prisma/client');
const qrPaymentService = require('../services/qrPayment.service');
const CustomError = require('../services/CustomError');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Tạo QR code thanh toán ngân hàng
exports.createBankQRPayment = async (req, res) => {
  try {
    const { id } = req.params; // order id
    const { customerId } = req; // từ middleware

    // Kiểm tra đơn hàng
    const order = await prisma.don_hang.findUnique({ 
      where: { id: Number(id) },
      include: {
        chi_tiet_don_hang: {
          include: {
            san_pham: true
          }
        }
      }
    });

    if (!order) {
      throw new CustomError('Không tìm thấy đơn hàng', 404);
    }

    // Kiểm tra quyền sở hữu (nếu có customerId)
    if (customerId && order.id_khach_hang !== customerId) {
      throw new CustomError('Không có quyền với đơn hàng này', 403);
    }

    // Kiểm tra trạng thái đơn hàng
    if (order.trang_thai !== 'cho_xac_nhan') {
      throw new CustomError('Đơn hàng không hợp lệ để thanh toán', 400);
    }

    if (order.trang_thai_thanh_toan) {
      throw new CustomError('Đơn hàng đã thanh toán', 400);
    }

    // Tạo QR payment
    const qrPayment = await qrPaymentService.createBankQRPayment(
      order.ma_don_hang,
      order.tong_tien,
      `Thanh toan don hang ${order.ma_don_hang}`
    );

    res.json({
      success: true,
      data: qrPayment,
      message: 'QR code thanh toán ngân hàng đã được tạo'
    });

  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Create bank QR payment error:', error);
    res.status(500).json({ error: 'Lỗi tạo QR thanh toán ngân hàng' });
  }
};

// Tạo QR code thanh toán MoMo
exports.createMoMoQRPayment = async (req, res) => {
  try {
    const { id } = req.params; // order id
    const { customerId } = req; // từ middleware

    // Kiểm tra đơn hàng
    const order = await prisma.don_hang.findUnique({ 
      where: { id: Number(id) },
      include: {
        chi_tiet_don_hang: {
          include: {
            san_pham: true
          }
        }
      }
    });

    if (!order) {
      throw new CustomError('Không tìm thấy đơn hàng', 404);
    }

    // Kiểm tra quyền sở hữu (nếu có customerId)
    if (customerId && order.id_khach_hang !== customerId) {
      throw new CustomError('Không có quyền với đơn hàng này', 403);
    }

    // Kiểm tra trạng thái đơn hàng
    if (order.trang_thai !== 'cho_xac_nhan') {
      throw new CustomError('Đơn hàng không hợp lệ để thanh toán', 400);
    }

    if (order.trang_thai_thanh_toan) {
      throw new CustomError('Đơn hàng đã thanh toán', 400);
    }

    // Tạo QR payment
    const qrPayment = await qrPaymentService.createMoMoQRPayment(
      order.ma_don_hang,
      order.tong_tien,
      `Thanh toan don hang ${order.ma_don_hang}`
    );

    res.json({
      success: true,
      data: qrPayment,
      message: 'QR code thanh toán MoMo đã được tạo'
    });

  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Create MoMo QR payment error:', error);
    res.status(500).json({ error: 'Lỗi tạo QR thanh toán MoMo' });
  }
};

// Kiểm tra trạng thái thanh toán
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const status = await qrPaymentService.checkPaymentStatus(transactionId);

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Check payment status error:', error);
    res.status(500).json({ error: 'Lỗi kiểm tra trạng thái thanh toán' });
  }
};

// Hủy giao dịch
exports.cancelTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const cancelled = qrPaymentService.cancelTransaction(transactionId);

    if (cancelled) {
      res.json({
        success: true,
        message: 'Giao dịch đã được hủy'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch'
      });
    }

  } catch (error) {
    console.error('Cancel transaction error:', error);
    res.status(500).json({ error: 'Lỗi hủy giao dịch' });
  }
};

// 🚀 NEW: Bank Webhook Handler - Nhận thông báo từ gateway khi có chuyển khoản
exports.handleBankWebhook = async (req, res) => {
  try {
    const body = req.body;
    console.log('🔔 Bank webhook received:', JSON.stringify(body, null, 2));

    // 1) Verify webhook signature để đảm bảo từ gateway thật
    if (!verifyWebhookSignature(body, req.headers)) {
      console.warn('❌ Invalid webhook signature');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    // 2) Parse payload theo format của gateway
    const paymentData = parseWebhookPayload(body);
    if (!paymentData) {
      console.warn('❌ Invalid webhook payload format');
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const { amount, description, transactionRef, bankCode, accountNumber } = paymentData;

    // 3) Chỉ xử lý giao dịch chuyển vào tài khoản MB Bank của mình
    const expectedAccount = process.env.VIETQR_ACCOUNT_NUMBER;
    const expectedBank = process.env.VIETQR_BANK_CODE;
    
    if (bankCode !== expectedBank || accountNumber !== expectedAccount) {
      console.log(`ℹ️ Transaction for different account: ${bankCode}-${accountNumber}`);
      return res.json({ success: true, ignored: true });
    }

    // 4) Tìm giao dịch pending phù hợp
    const matchedTransaction = await findMatchingPendingTransaction(amount, description);
    
    if (!matchedTransaction) {
      console.warn('⚠️ No matching pending transaction found');
      // Log để admin có thể xem xét
      await logUnmatchedWebhook({
        amount,
        description,
        transactionRef,
        bankCode,
        accountNumber,
        webhookBody: body
      });
      return res.json({ success: true, matched: false });
    }

    // 5) Xác nhận thanh toán thành công
    console.log(`✅ Processing payment for transaction: ${matchedTransaction.ma_giao_dich}`);
    await qrPaymentService.verifyBankTransaction(
      matchedTransaction.ma_giao_dich, 
      'BANK_WEBHOOK_AUTO'
    );

    console.log(`🎉 Payment confirmed successfully: ${matchedTransaction.ma_giao_dich}`);
    
    return res.json({ 
      success: true, 
      matched: true, 
      transactionId: matchedTransaction.ma_giao_dich 
    });

  } catch (error) {
    console.error('❌ Bank webhook error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Webhook để cập nhật trạng thái thanh toán từ MoMo
exports.updateMoMoPaymentStatus = async (req, res) => {
  try {
    const params = req.body;
    const { verifyMoMoSignature } = require('../utils/momo');
    
    const valid = verifyMoMoSignature(params);
    if (!valid) {
      return res.status(400).json({ message: 'invalid signature' });
    }

    const { orderId, resultCode } = params;
    
    // Cập nhật trạng thái trong QR service
    const transactionId = await qrPaymentService.updatePaymentStatus(orderId, 'paid');

    // Cập nhật database
    const order = await prisma.don_hang.findFirst({ 
      where: { ma_don_hang: orderId } 
    });
    
    if (order && Number(resultCode) === 0 && order.trang_thai === 'cho_xac_nhan') {
      await prisma.don_hang.update({
        where: { id: order.id },
        data: { 
          trang_thai_thanh_toan: true, 
          trang_thai: 'da_xac_nhan' 
        }
      });
    }

    res.json({ message: 'ok' });
  } catch (error) {
    console.error('Update MoMo payment status error:', error);
    res.status(500).json({ message: 'internal error' });
  }
};

// 🛡️ Helper Functions

// Verify webhook signature
function verifyWebhookSignature(body, headers) {
  const secret = process.env.BANK_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('⚠️ No BANK_WEBHOOK_SECRET configured, skipping signature verification');
    return true; // Trong dev có thể bỏ qua
  }

  // Các gateway khác nhau có cách verify khác nhau
  const signature = headers['x-signature'] || headers['X-Signature'] || headers['signature'];
  
  if (!signature) {
    return false;
  }

  // Sepay format: HMAC-SHA256
  if (process.env.SEPAY_TOKEN) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');
    return signature === expectedSignature;
  }

  // Casso format: check token
  if (process.env.CASSO_API_KEY) {
    return signature === secret;
  }

  // Default: simple string comparison
  return signature === secret;
}

// Parse webhook payload từ gateway
function parseWebhookPayload(body) {
  try {
    // Sepay.vn format
    if (body.type && body.data) {
      const data = body.data;
      return {
        amount: Number(data.amount || data.transferAmount),
        description: String(data.description || data.content || data.transferNote || ''),
        transactionRef: String(data.tid || data.transactionId || data.id),
        bankCode: String(data.accountBankCode || data.bankCode || 'MB').toUpperCase(),
        accountNumber: String(data.accountNumber || data.account)
      };
    }

    // Casso.vn format
    if (body.error === 0 && body.data && Array.isArray(body.data.records)) {
      const record = body.data.records[0]; // Lấy transaction đầu tiên
      if (record) {
        return {
          amount: Number(record.amount),
          description: String(record.description || ''),
          transactionRef: String(record.tid),
          bankCode: 'MB', // Casso thường cho MB Bank
          accountNumber: String(record.account)
        };
      }
    }

    // Generic format
    if (body.amount && body.description) {
      return {
        amount: Number(body.amount),
        description: String(body.description),
        transactionRef: String(body.transactionRef || body.id || ''),
        bankCode: String(body.bankCode || 'MB').toUpperCase(),
        accountNumber: String(body.accountNumber || process.env.VIETQR_ACCOUNT_NUMBER)
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing webhook payload:', error);
    return null;
  }
}

// Tìm giao dịch pending khớp với webhook
async function findMatchingPendingTransaction(amount, description) {
  try {
    // Lấy tất cả pending transactions chưa hết hạn
    const pendingTransactions = await prisma.giao_dich_ngan_hang.findMany({
      where: {
        trang_thai: 'cho_xac_nhan',
        thoi_gian_het_han: {
          gt: new Date() // Chưa hết hạn
        }
      },
      orderBy: {
        thoi_gian_tao: 'desc'
      }
    });

    // Tìm transaction khớp theo verification code và amount
    for (const tx of pendingTransactions) {
      const amountMatch = Math.abs(Number(tx.so_tien) - amount) < 1000; // Cho phép lệch < 1000 VND
      const codeMatch = description.includes(tx.ma_xac_minh); // Có verification code
      const orderMatch = description.includes(tx.ma_don_hang); // Hoặc có mã đơn hàng
      
      if (amountMatch && (codeMatch || orderMatch)) {
        return tx;
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding matching transaction:', error);
    return null;
  }
}

// Log webhook không khớp để admin xem xét
async function logUnmatchedWebhook(data) {
  try {
    // Có thể lưu vào database table riêng cho unmatched webhooks
    console.log('📝 Logging unmatched webhook:', {
      timestamp: new Date().toISOString(),
      amount: data.amount,
      description: data.description,
      transactionRef: data.transactionRef
    });
    
    // TODO: Lưu vào bảng webhook_logs nếu cần
  } catch (error) {
    console.error('Error logging unmatched webhook:', error);
  }
}

// 🎯 Admin function: Manual verify transaction (backup plan)
exports.manualVerifyTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { userId } = req; // Từ admin middleware
    
    if (!userId) {
      return res.status(401).json({ error: 'Chỉ admin mới có thể xác nhận thủ công' });
    }

    await qrPaymentService.verifyBankTransaction(transactionId, `ADMIN_${userId}`);
    
    res.json({
      success: true,
      message: 'Giao dịch đã được xác nhận thủ công'
    });
  } catch (error) {
    console.error('Manual verify transaction error:', error);
    res.status(500).json({ error: error.message });
  }
};