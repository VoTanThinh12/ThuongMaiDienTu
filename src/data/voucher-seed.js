const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const voucherData = [
  {
    ma_voucher: 'WELCOME10',
    ten_voucher: 'Chào mừng khách hàng mới',
    mo_ta: 'Giảm 10% cho đơn hàng đầu tiên',
    loai_giam_gia: 'phan_tram',
    gia_tri_giam: 10,
    gia_tri_toi_thieu: 50000,
    gia_tri_toi_da: 50000,
    so_luong: 1000,
    ngay_bat_dau: new Date(),
    ngay_ket_thuc: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
    trang_thai: 'hoat_dong'
  },
  {
    ma_voucher: 'FREESHIP50K',
    ten_voucher: 'Miễn phí ship 50k',
    mo_ta: 'Giảm 50k phí ship cho đơn hàng từ 100k',
    loai_giam_gia: 'tien_mat',
    gia_tri_giam: 50000,
    gia_tri_toi_thieu: 100000,
    gia_tri_toi_da: 50000,
    so_luong: 500,
    ngay_bat_dau: new Date(),
    ngay_ket_thuc: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 ngày
    trang_thai: 'hoat_dong'
  },
  {
    ma_voucher: 'SUMMER20',
    ten_voucher: 'Khuyến mãi mùa hè',
    mo_ta: 'Giảm 20% cho tất cả sản phẩm',
    loai_giam_gia: 'phan_tram',
    gia_tri_giam: 20,
    gia_tri_toi_thieu: 200000,
    gia_tri_toi_da: 100000,
    so_luong: 200,
    ngay_bat_dau: new Date(),
    ngay_ket_thuc: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày
    trang_thai: 'hoat_dong'
  },
  {
    ma_voucher: 'VIP30',
    ten_voucher: 'Khách hàng VIP',
    mo_ta: 'Giảm 30% cho khách hàng VIP',
    loai_giam_gia: 'phan_tram',
    gia_tri_giam: 30,
    gia_tri_toi_thieu: 500000,
    gia_tri_toi_da: 200000,
    so_luong: 50,
    ngay_bat_dau: new Date(),
    ngay_ket_thuc: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 ngày
    trang_thai: 'hoat_dong'
  },
  {
    ma_voucher: 'FLASH100K',
    ten_voucher: 'Flash sale 100k',
    mo_ta: 'Giảm ngay 100k cho đơn hàng từ 500k',
    loai_giam_gia: 'tien_mat',
    gia_tri_giam: 100000,
    gia_tri_toi_thieu: 500000,
    gia_tri_toi_da: 100000,
    so_luong: 100,
    ngay_bat_dau: new Date(),
    ngay_ket_thuc: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 ngày
    trang_thai: 'hoat_dong'
  }
];

async function seedVouchers() {
  try {
    console.log('🌱 Bắt đầu seed voucher data...');
    
    // Xóa tất cả voucher cũ (nếu có)
    await prisma.su_dung_voucher.deleteMany();
    await prisma.voucher.deleteMany();
    
    // Tạo voucher mới
    for (const voucher of voucherData) {
      await prisma.voucher.create({
        data: voucher
      });
      console.log(`✅ Đã tạo voucher: ${voucher.ma_voucher}`);
    }
    
    console.log('🎉 Hoàn thành seed voucher data!');
    console.log(`📊 Đã tạo ${voucherData.length} voucher`);
    
  } catch (error) {
    console.error('❌ Lỗi khi seed voucher data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy seed nếu file được gọi trực tiếp
if (require.main === module) {
  seedVouchers();
}

module.exports = { seedVouchers, voucherData };
