const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken, checkRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const Joi = require('joi');

const sanPhamSchema = Joi.object({
  ten_san_pham: Joi.string().max(100).required().messages({
    'string.empty': 'Tên sản phẩm không được để trống',
    'string.max': 'Tên sản phẩm không được vượt quá 100 ký tự',
  }),
  ma_san_pham: Joi.string().max(50).required().messages({
    'string.empty': 'Mã sản phẩm không được để trống',
    'string.max': 'Mã sản phẩm không được vượt quá 50 ký tự',
  }),
  don_vi_tinh: Joi.string().max(50).required().messages({
    'string.empty': 'Đơn vị tính không được để trống',
    'string.max': 'Đơn vị tính không được vượt quá 50 ký tự',
  }),
  gia_ban: Joi.number().positive().required().messages({
    'number.base': 'Giá bán phải là số',
    'number.positive': 'Giá bán phải lớn hơn 0',
  }),
  so_luong: Joi.number().integer().min(0).required().messages({
    'number.base': 'Số lượng phải là số nguyên',
    'number.min': 'Số lượng không được âm',
  }),
});

// GET: Danh sách sản phẩm (quản lý + nhân viên)
router.get('/', authenticateToken, checkRole(['quan_ly', 'nhan_vien']), async (req, res) => {
  try {
    const sanpham = await prisma.san_pham.findMany();
    res.json(sanpham);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sản phẩm:", error);
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách sản phẩm' });
  }
});

// POST: Thêm sản phẩm (chỉ quản lý)
router.post('/', authenticateToken, checkRole('quan_ly'), upload.single('hinh_anh'), async (req, res) => {
  const { error, value } = sanPhamSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ errors: error.details.map((e) => e.message) });
  }
  try {
    const sp = await prisma.san_pham.create({
      data: {
        ten_san_pham: value.ten_san_pham,
        ma_san_pham: value.ma_san_pham,
        don_vi_tinh: value.don_vi_tinh,
        gia_ban: parseFloat(value.gia_ban),
        so_luong: parseInt(value.so_luong),
        hinh_anh: req.file ? `/uploads/products/${req.file.filename}` : (value.hinh_anh || null)
      },
    });
    res.json(sp);
  } catch (error) {
    console.error("Lỗi khi thêm sản phẩm:", error);
    res.status(500).json({ error: 'Lỗi khi thêm sản phẩm: ' + error.message });
  }
});

// PUT: Cập nhật sản phẩm (chỉ quản lý)
router.put('/:id', authenticateToken, checkRole('quan_ly'), upload.single('hinh_anh'), async (req, res) => {
  const { id } = req.params;
  const { error, value } = sanPhamSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ errors: error.details.map((e) => e.message) });
  }
  try {
    const sp = await prisma.san_pham.update({
      where: { id: Number(id) },
      data: {
        ten_san_pham: value.ten_san_pham,
        ma_san_pham: value.ma_san_pham,
        don_vi_tinh: value.don_vi_tinh,
        gia_ban: parseFloat(value.gia_ban),
        so_luong: parseInt(value.so_luong),
        hinh_anh: req.file ? `/uploads/products/${req.file.filename}` : (value.hinh_anh || undefined)
      },
    });
    res.json(sp);
  } catch (error) {
    console.error("Lỗi khi cập nhật sản phẩm:", error);
    res.status(500).json({ error: 'Lỗi khi cập nhật sản phẩm: ' + error.message });
  }
});

// DELETE: Xóa sản phẩm (chỉ quản lý)
router.delete('/:id', authenticateToken, checkRole('quan_ly'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.san_pham.delete({
      where: { id: Number(id) },
    });
    res.json({ message: 'Đã xóa sản phẩm' });
  } catch (error) {
    console.error("Lỗi khi xóa sản phẩm:", error);
    res.status(500).json({ error: 'Lỗi khi xóa sản phẩm: ' + error.message });
  }
});

module.exports = router;
