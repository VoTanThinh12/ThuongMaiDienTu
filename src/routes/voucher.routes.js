const express = require('express');
const router = express.Router();
const {
  createVoucher,
  getVouchers,
  getVoucherByCode,
  applyVoucher,
  updateVoucher,
  deleteVoucher,
  getVoucherStats,
  getPopularVouchers
} = require('../controllers/voucher.controller');

// Tạo voucher mới (Admin only)
router.post('/', createVoucher);

// Lấy danh sách voucher
router.get('/', getVouchers);

// Lấy voucher theo mã
router.get('/code/:ma_voucher', getVoucherByCode);

// Áp dụng voucher
router.post('/apply', applyVoucher);

// Cập nhật voucher (Admin only)
router.put('/:id', updateVoucher);

// Xóa voucher (Admin only)
router.delete('/:id', deleteVoucher);

// Lấy thống kê voucher (Admin only)
router.get('/stats', getVoucherStats);

// Lấy voucher phổ biến
router.get('/popular', getPopularVouchers);

module.exports = router;
