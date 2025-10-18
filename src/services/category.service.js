// services/category.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CustomError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}

// CRUD cho danh_muc
exports.getAllCategories = async () => {
    return prisma.danh_muc.findMany({
        orderBy: { ten_danh_muc: 'asc' }
    });
};

exports.createCategory = async (data) => {
    try {
        return prisma.danh_muc.create({ data });
    } catch (e) {
        if (e.code === 'P2002') { 
            throw new CustomError('Tên danh mục đã tồn tại', 400);
        }
        throw e;
    }
};

exports.updateCategory = async (categoryId, data) => {
    try {
        return prisma.danh_muc.update({
            where: { id: Number(categoryId) },
            data
        });
    } catch (e) {
        if (e.code === 'P2025') {
            throw new CustomError('Không tìm thấy danh mục', 404);
        }
        throw e;
    }
};

exports.deleteCategory = async (categoryId) => {
    try {
        await prisma.danh_muc.delete({
            where: { id: Number(categoryId) }
        });
    } catch (e) {
        if (e.code === 'P2025') {
            throw new CustomError('Không tìm thấy danh mục', 404);
        }
        if (e.code === 'P2003') { // Lỗi khóa ngoại, nếu Schema không SetNull
             throw new CustomError('Không thể xóa danh mục này vì vẫn còn sản phẩm thuộc về nó.', 400);
        }
        throw e;
    }
};