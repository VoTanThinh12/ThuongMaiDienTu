// services/customer.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CustomError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}

// 1. Quản lý Yêu Thích (Wishlist)
exports.addToWishlist = async (customerId, productId) => {
    try {
        return prisma.yeu_thich.create({
            data: { id_khach_hang: customerId, id_san_pham: Number(productId) }
        });
    } catch (e) {
        if (e.code === 'P2002') { 
            throw new CustomError('Sản phẩm đã có trong danh sách yêu thích', 400);
        }
        throw e;
    }
};

exports.getWishlist = async (customerId) => {
    return prisma.yeu_thich.findMany({
        where: { id_khach_hang: customerId },
        include: { san_pham: { 
            select: { id: true, ten_san_pham: true, gia_ban: true, hinh_anh: true } 
        }}
    });
};

exports.removeFromWishlist = async (customerId, productId) => {
    const result = await prisma.yeu_thich.deleteMany({
        where: { id_khach_hang: customerId, id_san_pham: Number(productId) }
    });

    if (result.count === 0) {
        throw new CustomError('Không tìm thấy sản phẩm trong danh sách yêu thích', 404);
    }
    return true;
};

// 2. Xem Đánh Giá của Khách Hàng
exports.getCustomerReviews = async (customerId) => {
    return prisma.danh_gia.findMany({
        where: { id_khach_hang: customerId },
        include: { san_pham: { 
            select: { id: true, ten_san_pham: true } 
        }},
        orderBy: { ngay_tao: 'desc' }
    });
};