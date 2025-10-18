// services/cart.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Hàm tiện ích để ném ra lỗi có status code (giúp controller dễ xử lý)
class CustomError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}

// ------------------------------------------
// 1. Lấy giỏ hàng
// ------------------------------------------
exports.getCartItems = async (customerId) => {
    return prisma.gio_hang.findMany({
        where: { id_khach_hang: customerId },
        include: {
            san_pham: {
                select: {
                    id: true,
                    ten_san_pham: true,
                    ma_san_pham: true,
                    gia_ban: true,
                    so_luong: true,
                    don_vi_tinh: true
                }
            }
        },
        orderBy: { ngay_them: 'desc' }
    });
};

// ------------------------------------------
// 2. Thêm sản phẩm vào giỏ (Logic phức tạp nhất)
// ------------------------------------------
exports.addItemToCart = async (customerId, id_san_pham, so_luong) => {
    // 1. Validate đầu vào
    const productId = Number(id_san_pham);
    const quantity = Number(so_luong);
    if (!productId || !quantity || quantity < 1) {
        throw new CustomError('Dữ liệu không hợp lệ', 400);
    }

    // 2. Kiểm tra khách hàng tồn tại (tránh lỗi FK P2003)
    const customer = await prisma.khach_hang.findUnique({ where: { id: Number(customerId) } });
    if (!customer) {
        throw new CustomError('Tài khoản khách hàng không tồn tại', 401);
    }

    // 3. Kiểm tra sản phẩm và tồn kho (Query 1)
    const product = await prisma.san_pham.findUnique({
        where: { id: productId },
        select: { id: true, so_luong: true, don_vi_tinh: true, ten_san_pham: true, gia_ban: true }
    });

    if (!product) {
        throw new CustomError('Sản phẩm không tồn tại', 404);
    }

    if (product.so_luong < quantity) {
        throw new CustomError(`Sản phẩm chỉ còn ${product.so_luong} ${product.don_vi_tinh}`, 400);
    }

    // 4. Kiểm tra sản phẩm đã có trong giỏ chưa (Query 2)
    const existingItem = await prisma.gio_hang.findUnique({
        where: {
            id_khach_hang_id_san_pham: {
                id_khach_hang: Number(customerId),
                id_san_pham: productId
            }
        }
    });

    let cartItem;
    const includeSelect = { // Tái sử dụng cấu trúc include/select
        san_pham: { select: { id: true, ten_san_pham: true, gia_ban: true, so_luong: true } }
    };

    if (existingItem) {
        // Cập nhật số lượng
        const newQuantity = existingItem.so_luong + quantity;

        if (newQuantity > product.so_luong) {
            throw new CustomError(`Số lượng vượt quá tồn kho (còn ${product.so_luong})`, 400);
        }

        try {
            cartItem = await prisma.gio_hang.update({
                where: { id: existingItem.id },
                data: { so_luong: newQuantity },
                include: includeSelect
            });
        } catch (e) {
            if (e.code === 'P2003') {
                throw new CustomError('Tham chiếu không hợp lệ (khách hàng/sản phẩm)', 400);
            }
            throw e;
        }
    } else {
        // Thêm mới
        try {
            cartItem = await prisma.gio_hang.create({
                data: { id_khach_hang: Number(customerId), id_san_pham: productId, so_luong: quantity },
                include: includeSelect
            });
        } catch (e) {
            if (e.code === 'P2003') {
                throw new CustomError('Tham chiếu không hợp lệ (khách hàng/sản phẩm)', 400);
            }
            throw e;
        }
    }

    return cartItem;
};

// ------------------------------------------
// 3. Cập nhật số lượng
// ------------------------------------------
exports.updateCartItemQuantity = async (id, customerId, so_luong) => {
    if (!so_luong || so_luong < 1) {
        throw new CustomError('Số lượng không hợp lệ', 400);
    }

    // 1. Kiểm tra item thuộc về khách hàng này và lấy thông tin sản phẩm
    const cartItem = await prisma.gio_hang.findFirst({
        where: { id: parseInt(id), id_khach_hang: customerId },
        include: { san_pham: true }
    });

    if (!cartItem) {
        throw new CustomError('Không tìm thấy sản phẩm trong giỏ', 404);
    }

    // 2. Kiểm tra tồn kho
    if (so_luong > cartItem.san_pham.so_luong) {
        throw new CustomError(`Sản phẩm chỉ còn ${cartItem.san_pham.so_luong} ${cartItem.san_pham.don_vi_tinh}`, 400);
    }

    // 3. Cập nhật
    return prisma.gio_hang.update({
        where: { id: parseInt(id) },
        data: { so_luong },
        include: { san_pham: { select: { id: true, ten_san_pham: true, gia_ban: true, so_luong: true } } }
    });
};

// ------------------------------------------
// 4. Xóa sản phẩm khỏi giỏ
// ------------------------------------------
exports.removeCartItem = async (id, customerId) => {
    // Idempotent delete: xóa theo id + id_khach_hang, không lỗi nếu không tồn tại
    const result = await prisma.gio_hang.deleteMany({
        where: { id: parseInt(id), id_khach_hang: customerId }
    });
    return { deleted: result.count > 0 };
};

// ------------------------------------------
// 5. Xóa toàn bộ giỏ hàng
// ------------------------------------------
exports.clearCart = async (customerId) => {
    await prisma.gio_hang.deleteMany({
        where: { id_khach_hang: customerId }
    });
};