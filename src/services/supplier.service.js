// services/supplier.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CustomError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}

// CRUD cho nha_cung_cap
exports.getAllSuppliers = async () => {
    return prisma.nha_cung_cap.findMany({
        orderBy: { ten_nha_cung_cap: 'asc' }
    });
};

exports.createSupplier = async (data) => {
    try {
        return prisma.nha_cung_cap.create({ data });
    } catch (e) {
        throw e;
    }
};

exports.updateSupplier = async (supplierId, data) => {
    try {
        return prisma.nha_cung_cap.update({
            where: { id: Number(supplierId) },
            data
        });
    } catch (e) {
        if (e.code === 'P2025') {
            throw new CustomError('Không tìm thấy Nhà Cung Cấp', 404);
        }
        throw e;
    }
};

exports.deleteSupplier = async (supplierId) => {
    try {
        await prisma.nha_cung_cap.delete({
            where: { id: Number(supplierId) }
        });
    } catch (e) {
        if (e.code === 'P2025') {
            throw new CustomError('Không tìm thấy Nhà Cung Cấp', 404);
        }
        if (e.code === 'P2003') { // Lỗi khóa ngoại
             throw new CustomError('Không thể xóa Nhà Cung Cấp này vì họ vẫn đang có phiếu nhập liên quan.', 400);
        }
        throw e;
    }
};