const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken, checkRole } = require('../middleware/auth');
const Joi = require('joi');

const hoaDonBanSchema = Joi.object({
  id_nhan_vien: Joi.number().integer().required().messages({
    'number.base': 'ID nhân viên phải là số nguyên',
    'any.required': 'ID nhân viên là bắt buộc',
  }),
  danhSachSanPham: Joi.array()
    .items(
      Joi.object({
        id_san_pham: Joi.number().integer().required().messages({
          'number.base': 'ID sản phẩm phải là số nguyên',
          'any.required': 'ID sản phẩm là bắt buộc',
        }),
        so_luong: Joi.number().integer().min(1).required().messages({
          'number.base': 'Số lượng phải là số nguyên',
          'number.min': 'Số lượng phải lớn hơn 0',
          'any.required': 'Số lượng là bắt buộc',
        }),
        don_gia: Joi.number().positive().required().messages({
          'number.base': 'Đơn giá phải là số',
          'number.positive': 'Đơn giá phải lớn hơn 0',
          'any.required': 'Đơn giá là bắt buộc',
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'Danh sách sản phẩm phải có ít nhất 1 sản phẩm',
      'any.required': 'Danh sách sản phẩm là bắt buộc',
    }),
});

// Tạo hóa đơn bán — cho quản lý hoặc nhân viên
router.post('/tao', authenticateToken, checkRole(['quan_ly', 'nhan_vien']), async (req, res) => {
  const { error, value } = hoaDonBanSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ errors: error.details.map((e) => e.message) });
  }
  try {
    // Kiểm tra tồn kho
    for (const sp of value.danhSachSanPham) {
      const sanPham = await prisma.san_pham.findUnique({ where: { id: sp.id_san_pham } });
      if (!sanPham || sanPham.so_luong < sp.so_luong) {
        return res.status(400).json({ error: `Sản phẩm ${sanPham?.ten_san_pham || ''} không đủ tồn kho` });
      }
    }

    const newHoaDon = await prisma.hoa_don_ban.create({
      data: {
        id_nhan_vien: value.id_nhan_vien,
        ngay_ban: new Date(),
        tong_tien: value.danhSachSanPham.reduce((total, sp) => total + sp.so_luong * sp.don_gia, 0),
        chi_tiet_hoa_don_ban: {
          create: value.danhSachSanPham.map((sp) => ({
            id_san_pham: sp.id_san_pham,
            so_luong: sp.so_luong,
            don_gia: parseFloat(sp.don_gia),
          })),
        },
      },
      include: { chi_tiet_hoa_don_ban: true },
    });

    // Cập nhật tồn kho song song
    await Promise.all(
      value.danhSachSanPham.map(sp =>
        prisma.san_pham.update({
          where: { id: sp.id_san_pham },
          data: { so_luong: { decrement: sp.so_luong } },
        })
      )
    );

    res.json(newHoaDon);
  } catch (error) {
    console.error("Lỗi khi tạo hóa đơn bán:", error);
    res.status(500).json({ error: 'Lỗi khi tạo hóa đơn bán: ' + error.message });
  }
});

// Lấy danh sách hóa đơn — chỉ quản lý
router.get('/', authenticateToken, checkRole('quan_ly'), async (req, res) => {
  try {
    const hoaDons = await prisma.hoa_don_ban.findMany({
      include: { chi_tiet_hoa_don_ban: true, nhan_vien: true },
    });
    res.json(hoaDons);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách hóa đơn:", error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách hóa đơn: ' + error.message });
  }
});

// Test route - không cần auth
router.get('/test', (req, res) => {
  console.log('🔥 Test route hit!');
  res.json({ message: 'Test route working!', timestamp: new Date() });
});

// Lấy chi tiết hóa đơn theo ID — chỉ quản lý
router.get('/:id/chitiet', authenticateToken, checkRole('quan_ly'), async (req, res) => {
  console.log(`🔍 Getting bill details for ID: ${req.params.id}`);
  const { id } = req.params;
  
  try {
    console.log(`📊 Querying chi_tiet_hoa_don_ban for id_hoa_don: ${id}`);
    
    const chiTietHoaDon = await prisma.chi_tiet_hoa_don_ban.findMany({
      where: { id_hoa_don: Number(id) },
      include: {
        san_pham: {
          select: {
            id: true,
            ten_san_pham: true,
            ma_san_pham: true,
            don_vi_tinh: true,
            gia_ban: true,
            so_luong: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });
    
    console.log(`✅ Found ${chiTietHoaDon.length} items for bill ${id}`);
    console.log('📋 Data:', JSON.stringify(chiTietHoaDon, null, 2));
    
    res.json(chiTietHoaDon);
  } catch (error) {
    console.error("❌ Lỗi khi lấy chi tiết hóa đơn:", error);
    res.status(500).json({ error: 'Lỗi khi lấy chi tiết hóa đơn: ' + error.message });
  }
});

// Xóa hóa đơn — chỉ quản lý
router.delete('/:id', authenticateToken, checkRole('quan_ly'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.chi_tiet_hoa_don_ban.deleteMany({ where: { id_hoa_don: Number(id) } });
    await prisma.hoa_don_ban.delete({ where: { id: Number(id) } });
    res.json({ message: 'Đã xóa hóa đơn' });
  } catch (error) {
    console.error("Lỗi khi xóa hóa đơn:", error);
    res.status(500).json({ error: 'Lỗi khi xóa hóa đơn: ' + error.message });
  }
});

module.exports = router;
