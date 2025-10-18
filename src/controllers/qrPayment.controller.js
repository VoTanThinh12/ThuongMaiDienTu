const { PrismaClient } = require('@prisma/client');
const qrPaymentService = require('../services/qrPayment.service');
const CustomError = require('../services/CustomError');

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

// Loại bỏ toàn bộ handler admin/detection liên quan xác nhận chuyển khoản ngân hàng

