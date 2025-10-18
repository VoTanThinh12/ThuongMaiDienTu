const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class VoucherService {
  // Tạo mã voucher tự động
  static generateVoucherCode(prefix = 'VOUCHER') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}_${timestamp}_${random}`.toUpperCase();
  }

  // Kiểm tra voucher có hợp lệ không
  static async validateVoucher(ma_voucher, tong_tien_gio_hang, id_khach_hang) {
    const voucher = await prisma.voucher.findUnique({
      where: { ma_voucher }
    });

    if (!voucher) {
      throw new Error('Không tìm thấy voucher');
    }

    const now = new Date();
    
    // Kiểm tra hạn sử dụng
    if (voucher.ngay_ket_thuc < now) {
      throw new Error('Voucher đã hết hạn');
    }

    // Kiểm tra số lượng
    if (voucher.so_luong_da_dung >= voucher.so_luong) {
      throw new Error('Voucher đã hết lượt sử dụng');
    }

    // Kiểm tra trạng thái
    if (voucher.trang_thai !== 'hoat_dong') {
      throw new Error('Voucher không khả dụng');
    }

    // Kiểm tra giá trị tối thiểu
    if (voucher.gia_tri_toi_thieu && tong_tien_gio_hang < voucher.gia_tri_toi_thieu) {
      throw new Error(`Đơn hàng phải có giá trị tối thiểu ${voucher.gia_tri_toi_thieu.toLocaleString('vi-VN')}đ`);
    }

    return voucher;
  }

  // Tính toán số tiền giảm
  static calculateDiscount(voucher, tong_tien_gio_hang) {
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

    return so_tien_giam;
  }

  // Sử dụng voucher
  static async useVoucher(id_voucher, id_don_hang, id_khach_hang, so_tien_giam) {
    const transaction = await prisma.$transaction(async (tx) => {
      // Tạo record sử dụng voucher
      const suDungVoucher = await tx.su_dung_voucher.create({
        data: {
          id_voucher,
          id_don_hang,
          id_khach_hang,
          so_tien_giam
        }
      });

      // Cập nhật số lượng đã dùng
      await tx.voucher.update({
        where: { id: id_voucher },
        data: {
          so_luong_da_dung: {
            increment: 1
          }
        }
      });

      return suDungVoucher;
    });

    return transaction;
  }

  // Lấy voucher phổ biến
  static async getPopularVouchers(limit = 5) {
    return await prisma.voucher.findMany({
      where: {
        trang_thai: 'hoat_dong',
        ngay_ket_thuc: { gt: new Date() }
      },
      orderBy: [
        { so_luong_da_dung: 'desc' },
        { ngay_tao: 'desc' }
      ],
      take: limit
    });
  }

  // Lấy voucher theo danh mục (nếu có)
  static async getVouchersByCategory(category, limit = 10) {
    return await prisma.voucher.findMany({
      where: {
        trang_thai: 'hoat_dong',
        ngay_ket_thuc: { gt: new Date() },
        // Có thể thêm filter theo danh mục nếu cần
      },
      take: limit,
      orderBy: { ngay_tao: 'desc' }
    });
  }

  // Kiểm tra voucher đã được sử dụng bởi khách hàng chưa
  static async checkVoucherUsage(id_voucher, id_khach_hang) {
    const usage = await prisma.su_dung_voucher.findFirst({
      where: {
        id_voucher,
        id_khach_hang
      }
    });

    return !!usage;
  }

  // Lấy lịch sử sử dụng voucher của khách hàng
  static async getCustomerVoucherHistory(id_khach_hang, limit = 10) {
    return await prisma.su_dung_voucher.findMany({
      where: { id_khach_hang },
      include: {
        voucher: true,
        don_hang: {
          select: {
            ma_don_hang: true,
            tong_tien: true,
            ngay_tao: true
          }
        }
      },
      orderBy: { ngay_su_dung: 'desc' },
      take: limit
    });
  }

  // Tự động cập nhật trạng thái voucher hết hạn
  static async updateExpiredVouchers() {
    const now = new Date();
    
    const result = await prisma.voucher.updateMany({
      where: {
        ngay_ket_thuc: { lt: now },
        trang_thai: 'hoat_dong'
      },
      data: {
        trang_thai: 'het_han'
      }
    });

    return result;
  }

  // Tự động cập nhật trạng thái voucher hết lượt
  static async updateOutOfStockVouchers() {
    const result = await prisma.voucher.updateMany({
      where: {
        so_luong_da_dung: { gte: prisma.voucher.fields.so_luong },
        trang_thai: 'hoat_dong'
      },
      data: {
        trang_thai: 'het_luong'
      }
    });

    return result;
  }
}

module.exports = VoucherService;
