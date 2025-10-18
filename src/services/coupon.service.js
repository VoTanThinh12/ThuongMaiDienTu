// services/coupon.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Sử dụng lại CustomError
class CustomError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}

// ------------------------------------------
// Hàm áp dụng mã giảm giá
// ------------------------------------------
exports.applyCoupon = async (ma_giam_gia_code, tong_tien_goc) => {
    if (!ma_giam_gia_code) return { total: tong_tien_goc, discount: 0 };

    const now = new Date();

    const coupon = await prisma.ma_giam_gia.findUnique({
        where: { ma: ma_giam_gia_code }
    });

    if (!coupon) {
        throw new CustomError('Mã giảm giá không tồn tại.', 400);
    }

    // 1. Kiểm tra trạng thái
    if (!coupon.trang_thai) {
        throw new CustomError('Mã giảm giá đã bị vô hiệu hóa.', 400);
    }

    // 2. Kiểm tra ngày hết hạn
    if (coupon.ngay_bat_dau > now || coupon.ngay_ket_thuc < now) {
        throw new CustomError('Mã giảm giá chưa đến hạn hoặc đã hết hạn sử dụng.', 400);
    }

    // 3. Kiểm tra số lượng
    if (coupon.so_luong <= 0) {
        throw new CustomError('Mã giảm giá đã hết lượt sử dụng.', 400);
    }

    let discountAmount = 0;
    
    // Tính toán giảm giá
    if (coupon.phan_tram_giam) {
        discountAmount = tong_tien_goc * (coupon.phan_tram_giam / 100);
    } else if (coupon.gia_tri_giam) {
        discountAmount = Number(coupon.gia_tri_giam);
    }

    // Tổng tiền sau giảm giá
    const finalTotal = tong_tien_goc - discountAmount;

    return {
        tong_tien_cuoi: finalTotal < 0 ? 0 : finalTotal,
        gia_tri_giam: discountAmount,
        ma_giam_gia: coupon
    };
};

// ------------------------------------------
// Giảm số lượng mã giảm giá (Chỉ được gọi trong Transaction)
// ------------------------------------------
exports.decrementCouponUsage = async (tx, ma_giam_gia_id) => {
    return tx.ma_giam_gia.update({
        where: { id: ma_giam_gia_id },
        data: { so_luong: { decrement: 1 } }
    });
};