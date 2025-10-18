// services/auth.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class CustomError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}

// Logic Đăng ký
exports.registerCustomer = async ({ ho_ten, email, so_dien_thoai, mat_khau }) => {
    // 1. Kiểm tra email đã tồn tại
    const existingCustomer = await prisma.khach_hang.findUnique({
        where: { email }
    });

    if (existingCustomer) {
        throw new CustomError('Email đã được sử dụng', 400);
    }

    // 2. Hash mật khẩu
    const hashedPassword = await bcrypt.hash(mat_khau, 10);

    // 3. Tạo khách hàng mới
    const customer = await prisma.khach_hang.create({
        data: { ho_ten, email, so_dien_thoai, mat_khau: hashedPassword },
        select: { id: true, ho_ten: true, email: true, so_dien_thoai: true }
    });

    return customer;
};

// Logic Đăng nhập
exports.loginCustomer = async ({ email, mat_khau }) => {
    // 1. Tìm khách hàng
    const customer = await prisma.khach_hang.findUnique({
        where: { email }
    });

    if (!customer) {
        throw new CustomError('Email hoặc mật khẩu không đúng', 401);
    }

    // 2. Kiểm tra mật khẩu
    const isValidPassword = await bcrypt.compare(mat_khau, customer.mat_khau);
    if (!isValidPassword) {
        throw new CustomError('Email hoặc mật khẩu không đúng', 401);
    }

    // 3. Tạo token
    const token = jwt.sign(
        { id: customer.id, type: 'customer' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    return { 
        token, 
        customer: { id: customer.id, ho_ten: customer.ho_ten, email: customer.email, so_dien_thoai: customer.so_dien_thoai } 
    };
};

// Logic Lấy hồ sơ
exports.getCustomerProfile = async (customerId) => {
    const customer = await prisma.khach_hang.findUnique({
        where: { id: customerId },
        select: { id: true, ho_ten: true, email: true, so_dien_thoai: true, ngay_tao: true } // Bỏ dia_chi cũ, thay bằng address service
    });

    if (!customer) {
        throw new CustomError('Không tìm thấy thông tin khách hàng', 404);
    }
    return customer;
};

// Logic Cập nhật hồ sơ
exports.updateCustomerProfile = async (customerId, { ho_ten, so_dien_thoai }) => {
    // Lưu ý: Tách quản lý địa chỉ sang address.service.js
    const customer = await prisma.khach_hang.update({
        where: { id: customerId },
        data: { ho_ten, so_dien_thoai },
        select: { id: true, ho_ten: true, email: true, so_dien_thoai: true }
    });

    return customer;
};