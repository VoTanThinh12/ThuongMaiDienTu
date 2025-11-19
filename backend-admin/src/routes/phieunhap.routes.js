const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken, checkRole } = require('../middleware/auth');
const Joi = require('joi');

const phieuNhapSchema = Joi.object({
  id_nha_cung_cap: Joi.number().integer().required().messages({
    'number.base': 'ID nhà cung cấp phải là số nguyên',
    'any.required': 'ID nhà cung cấp là bắt buộc',
  }),
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
        so_luong_nhap: Joi.number().integer().min(1).required().messages({
          'number.base': 'Số lượng nhập phải là số nguyên',
          'number.min': 'Số lượng nhập phải lớn hơn 0',
          'any.required': 'Số lượng nhập là bắt buộc',
        }),
        gia_nhap: Joi.number().positive().required().messages({
          'number.base': 'Giá nhập phải là số',
          'number.positive': 'Giá nhập phải lớn hơn 0',
          'any.required': 'Giá nhập là bắt buộc',
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

// Tạo phiếu nhập (quản lý hoặc nhân viên đều có thể)
router.post('/tao', authenticateToken, checkRole(['quan_ly', 'nhan_vien']), async (req, res) => {
  const { error, value } = phieuNhapSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ errors: error.details.map((e) => e.message) });
  }
  try {
    const newPhieuNhap = await prisma.phieu_nhap.create({
      data: {
        id_nha_cung_cap: value.id_nha_cung_cap,
        id_nhan_vien: value.id_nhan_vien,
        ngay_nhap: new Date(),
        chi_tiet_phieu_nhap: {
          create: value.danhSachSanPham.map((sp) => ({
            id_san_pham: sp.id_san_pham,
            so_luong_nhap: sp.so_luong_nhap,
            gia_nhap: parseFloat(sp.gia_nhap),
          })),
        },
      },
      include: { chi_tiet_phieu_nhap: true },
    });

    // Cập nhật số lượng tồn kho song song
    await Promise.all(
      value.danhSachSanPham.map(sp =>
        prisma.san_pham.update({
          where: { id: sp.id_san_pham },
          data: { so_luong: { increment: sp.so_luong_nhap } },
        })
      )
    );

    res.json(newPhieuNhap);
  } catch (error) {
    console.error("Lỗi khi tạo phiếu nhập:", error);
    res.status(500).json({ error: 'Lỗi khi tạo phiếu nhập hàng: ' + error.message });
  }
});

// Lấy danh sách phiếu nhập
router.get('/', authenticateToken, checkRole('quan_ly'), async (req, res) => {
  try {
    const phieuNhap = await prisma.phieu_nhap.findMany({
      include: { chi_tiet_phieu_nhap: true, nha_cung_cap: true, nhan_vien: true },
    });
    res.json(phieuNhap);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách phiếu nhập:", error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách phiếu nhập: ' + error.message });
  }
});

// Cập nhật phiếu nhập (chỉ quản lý)
router.put('/:id', authenticateToken, checkRole('quan_ly'), async (req, res) => {
  const { id } = req.params;
  const { error, value } = phieuNhapSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({ errors: error.details.map((e) => e.message) });
  }
  try {
    await prisma.chi_tiet_phieu_nhap.deleteMany({ where: { id_phieu_nhap: Number(id) } });

    const phieuNhap = await prisma.phieu_nhap.update({
      where: { id: Number(id) },
      data: {
        id_nha_cung_cap: value.id_nha_cung_cap,
        id_nhan_vien: value.id_nhan_vien,
        ngay_nhap: new Date(),
        chi_tiet_phieu_nhap: {
          create: value.danhSachSanPham.map((sp) => ({
            id_san_pham: sp.id_san_pham,
            so_luong_nhap: sp.so_luong_nhap,
            gia_nhap: parseFloat(sp.gia_nhap),
          })),
        },
      },
      include: { chi_tiet_phieu_nhap: true },
    });

    // Cập nhật tồn kho song song
    await Promise.all(
      value.danhSachSanPham.map(sp =>
        prisma.san_pham.update({
          where: { id: sp.id_san_pham },
          data: { so_luong: { increment: sp.so_luong_nhap } },
        })
      )
    );

    res.json(phieuNhap);
  } catch (error) {
    console.error("Lỗi khi cập nhật phiếu nhập:", error);
    res.status(500).json({ error: 'Lỗi khi cập nhật phiếu nhập: ' + error.message });
  }
});

// Xóa phiếu nhập (chỉ quản lý)
router.delete('/:id', authenticateToken, checkRole('quan_ly'), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.chi_tiet_phieu_nhap.deleteMany({ where: { id_phieu_nhap: Number(id) } });
    await prisma.phieu_nhap.delete({ where: { id: Number(id) } });
    res.json({ message: 'Đã xóa phiếu nhập' });
  } catch (error) {
    console.error("Lỗi khi xóa phiếu nhập:", error);
    res.status(500).json({ error: 'Lỗi khi xóa phiếu nhập: ' + error.message });
  }
});

module.exports = router;
