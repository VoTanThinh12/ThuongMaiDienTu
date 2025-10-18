// services/product.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CustomError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}
// Gợi ý tìm kiếm dựa trên từ khóa và danh mục
exports.getSuggestions = async (q) => {
    const query = String(q || '').trim();
    if (!query) return [];

    const items = await prisma.san_pham.findMany({
        where: {
            OR: [
                { ten_san_pham: { contains: query } },
                { ma_san_pham: { contains: query } }
            ]
        },
        select: { id: true, ten_san_pham: true, danh_muc: true },
        take: 8
    });
    return items.map(i => ({ id: i.id, label: i.ten_san_pham, category: i.danh_muc }));
};

// ------------------------------------------
// ADMIN: Tạo sản phẩm
// ------------------------------------------
exports.createProduct = async (data) => {
    try {
        // Kiểm tra logic nghiệp vụ phức tạp hơn (ví dụ: mã sản phẩm duy nhất)
        const existing = await prisma.san_pham.findUnique({
            where: { ma_san_pham: data.ma_san_pham }
        });
        if (existing) {
            throw new CustomError('Mã sản phẩm đã tồn tại', 400);
        }
        
        return prisma.san_pham.create({
            data: {
                ...data,
                gia_ban: parseFloat(data.gia_ban),
                so_luong: parseInt(data.so_luong),
            }
        });
    } catch (error) {
        throw error;
    }
};

// ------------------------------------------
// ADMIN/STOREFRONT: Lấy danh sách sản phẩm
// ------------------------------------------
exports.getAllProducts = async (isAdmin = false, options = {}) => {
    const { page = 1, limit = 12, sortBy = 'ten_san_pham', sortOrder = 'asc', q, minPrice, maxPrice, inStock = false, nameKeywords, category } = options;

    const selectFields = isAdmin
        ? undefined // Admin: lấy full
        : { 
            id: true, 
            ten_san_pham: true, 
            ma_san_pham: true, 
            gia_ban: true, 
            don_vi_tinh: true,
            so_luong: true,
            hinh_anh: true,
            danh_muc: true
        }; 

    const where = {};

    if (!isAdmin && inStock) {
        where.so_luong = { gt: 0 };
    }
    if (q) {
        where.OR = [
            { ten_san_pham: { contains: q } },
            { ma_san_pham: { contains: q } }
        ];
    }
    if (Array.isArray(nameKeywords) && nameKeywords.length > 0) {
        const ors = nameKeywords.map((kw) => ({ ten_san_pham: { contains: kw } }));
        if (where.OR) {
            where.OR = [...where.OR, ...ors];
        } else {
            where.OR = ors;
        }
    }
    if (category) {
        where.danh_muc = category;
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
        where.gia_ban = {};
        if (minPrice !== undefined) where.gia_ban.gte = minPrice;
        if (maxPrice !== undefined) where.gia_ban.lte = maxPrice;
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const [total, items] = await Promise.all([
        prisma.san_pham.count({ where }),
        prisma.san_pham.findMany({
            where,
            select: selectFields,
            orderBy: { [sortBy]: sortOrder },
            skip,
            take
        })
    ]);

    return {
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        },
        items
    };
};

// ------------------------------------------
// ADMIN/STOREFRONT: Lấy chi tiết sản phẩm
// ------------------------------------------
exports.getProductDetail = async (productId, isAdmin = false) => {
    const product = await prisma.san_pham.findUnique({
        where: { id: Number(productId) }
    });
    
    if (!product || (!isAdmin && product.so_luong <= 0)) {
        throw new CustomError('Sản phẩm không tồn tại hoặc đã hết hàng', 404);
    }
    
    // Admin có thể thấy mọi chi tiết, Khách hàng chỉ thấy những gì cần thiết
    if (!isAdmin) {
        // ... filter các trường nhạy cảm như số lượng tồn kho chính xác
    }
    
    return product;
};

// ------------------------------------------
// ADMIN: Cập nhật sản phẩm
// ------------------------------------------
exports.updateProduct = async (productId, data) => {
    try {
        return prisma.san_pham.update({
            where: { id: Number(productId) },
            data: {
                ...data,
                gia_ban: parseFloat(data.gia_ban),
                so_luong: parseInt(data.so_luong),
            }
        });
    } catch (e) {
        // Xử lý lỗi Not Found của Prisma khi update
        if (e.code === 'P2025') { 
            throw new CustomError(`Không tìm thấy sản phẩm với id ${productId}`, 404);
        }
        throw e;
    }
};

// ------------------------------------------
// ADMIN: Xóa sản phẩm
// ------------------------------------------
exports.deleteProduct = async (productId) => {
    try {
        await prisma.san_pham.delete({
            where: { id: Number(productId) },
        });
    } catch (e) {
         if (e.code === 'P2025') { 
            throw new CustomError(`Không tìm thấy sản phẩm với id ${productId}`, 404);
        }
        throw e;
    }
};