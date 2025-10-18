const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const VoucherService = require('../services/voucher.service');

// Tạo voucher mới
const createVoucher = async (req, res) => {
  try {
    const {
      ma_voucher,
      ten_voucher,
      mo_ta,
      loai_giam_gia,
      gia_tri_giam,
      gia_tri_toi_thieu,
      gia_tri_toi_da,
      so_luong,
      ngay_bat_dau,
      ngay_ket_thuc
    } = req.body;

    // Kiểm tra mã voucher đã tồn tại
    const existingVoucher = await prisma.voucher.findUnique({
      where: { ma_voucher }
    });

    if (existingVoucher) {
      return res.status(400).json({
        success: false,
        message: 'Mã voucher đã tồn tại'
      });
    }

    const voucher = await prisma.voucher.create({
      data: {
        ma_voucher,
        ten_voucher,
        mo_ta,
        loai_giam_gia,
        gia_tri_giam,
        gia_tri_toi_thieu,
        gia_tri_toi_da,
        so_luong,
        ngay_bat_dau: new Date(ngay_bat_dau),
        ngay_ket_thuc: new Date(ngay_ket_thuc)
      }
    });

    res.status(201).json({
      success: true,
      message: 'Tạo voucher thành công',
      data: voucher
    });
  } catch (error) {
    console.error('Create voucher error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo voucher'
    });
  }
};

// Lấy danh sách voucher
const getVouchers = async (req, res) => {
  try {
    const { page = 1, limit = 10, trang_thai, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (trang_thai) where.trang_thai = trang_thai;
    if (search) {
      where.OR = [
        { ma_voucher: { contains: search } },
        { ten_voucher: { contains: search } }
      ];
    }

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { ngay_tao: 'desc' }
      }),
      prisma.voucher.count({ where })
    ]);

    res.json({
      success: true,
      data: vouchers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get vouchers error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách voucher'
    });
  }
};

// Lấy voucher theo mã
const getVoucherByCode = async (req, res) => {
  try {
    const { ma_voucher } = req.params;

    const voucher = await prisma.voucher.findUnique({
      where: { ma_voucher }
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy voucher'
      });
    }

    // Kiểm tra voucher có còn hiệu lực không
    const now = new Date();
    if (voucher.ngay_ket_thuc < now) {
      return res.status(400).json({
        success: false,
        message: 'Voucher đã hết hạn'
      });
    }

    if (voucher.so_luong_da_dung >= voucher.so_luong) {
      return res.status(400).json({
        success: false,
        message: 'Voucher đã hết lượt sử dụng'
      });
    }

    if (voucher.trang_thai !== 'hoat_dong') {
      return res.status(400).json({
        success: false,
        message: 'Voucher không khả dụng'
      });
    }

    res.json({
      success: true,
      data: voucher
    });
  } catch (error) {
    console.error('Get voucher by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin voucher'
    });
  }
};

// Áp dụng voucher
const applyVoucher = async (req, res) => {
  try {
    const { ma_voucher, tong_tien_gio_hang, id_khach_hang } = req.body;

    // Lấy thông tin voucher
    const voucher = await prisma.voucher.findUnique({
      where: { ma_voucher }
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy voucher'
      });
    }

    // Kiểm tra điều kiện voucher
    const now = new Date();
    if (voucher.ngay_ket_thuc < now) {
      return res.status(400).json({
        success: false,
        message: 'Voucher đã hết hạn'
      });
    }

    if (voucher.so_luong_da_dung >= voucher.so_luong) {
      return res.status(400).json({
        success: false,
        message: 'Voucher đã hết lượt sử dụng'
      });
    }

    if (voucher.trang_thai !== 'hoat_dong') {
      return res.status(400).json({
        success: false,
        message: 'Voucher không khả dụng'
      });
    }

    // Kiểm tra giá trị tối thiểu
    if (voucher.gia_tri_toi_thieu && tong_tien_gio_hang < voucher.gia_tri_toi_thieu) {
      return res.status(400).json({
        success: false,
        message: `Đơn hàng phải có giá trị tối thiểu ${voucher.gia_tri_toi_thieu.toLocaleString('vi-VN')}đ`
      });
    }

    // Tính toán số tiền giảm
    let so_tien_giam = 0;
    if (voucher.loai_giam_gia === 'phan_tram') {
      so_tien_giam = (tong_tien_gio_hang * voucher.gia_tri_giam) / 100;
    } else {
      so_tien_giam = voucher.gia_tri_giam;
    }

    // Áp dụng giới hạn tối đa
    if (voucher.gia_tri_toi_da && so_tien_giam > voucher.gia_tri_toi_da) {
      so_tien_giam = voucher.gia_tri_toi_da;
    }

    // Đảm bảo không giảm quá tổng tiền
    if (so_tien_giam > tong_tien_gio_hang) {
      so_tien_giam = tong_tien_gio_hang;
    }

    res.json({
      success: true,
      data: {
        voucher,
        so_tien_giam,
        tong_tien_sau_giam: tong_tien_gio_hang - so_tien_giam
      }
    });
  } catch (error) {
    console.error('Apply voucher error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi áp dụng voucher'
    });
  }
};

// Cập nhật voucher
const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const voucher = await prisma.voucher.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Cập nhật voucher thành công',
      data: voucher
    });
  } catch (error) {
    console.error('Update voucher error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật voucher'
    });
  }
};

// Xóa voucher
const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.voucher.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Xóa voucher thành công'
    });
  } catch (error) {
    console.error('Delete voucher error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa voucher'
    });
  }
};

// Lấy thống kê voucher
const getVoucherStats = async (req, res) => {
  try {
    const stats = await prisma.voucher.aggregate({
      _count: {
        id: true
      },
      _sum: {
        so_luong: true,
        so_luong_da_dung: true
      }
    });

    const activeVouchers = await prisma.voucher.count({
      where: { trang_thai: 'hoat_dong' }
    });

    const expiredVouchers = await prisma.voucher.count({
      where: {
        ngay_ket_thuc: { lt: new Date() }
      }
    });

    res.json({
      success: true,
      data: {
        tong_so_voucher: stats._count.id,
        tong_luot_su_dung: stats._sum.so_luong_da_dung || 0,
        tong_luot_phat_hanh: stats._sum.so_luong || 0,
        voucher_dang_hoat_dong: activeVouchers,
        voucher_het_han: expiredVouchers
      }
    });
  } catch (error) {
    console.error('Get voucher stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thống kê voucher'
    });
  }
};

// Lấy voucher phổ biến
const getPopularVouchers = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const vouchers = await VoucherService.getPopularVouchers(parseInt(limit));
    
    res.json({
      success: true,
      data: vouchers
    });
  } catch (error) {
    console.error('Get popular vouchers error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy voucher phổ biến'
    });
  }
};

module.exports = {
  createVoucher,
  getVouchers,
  getVoucherByCode,
  applyVoucher,
  updateVoucher,
  deleteVoucher,
  getVoucherStats,
  getPopularVouchers
};
