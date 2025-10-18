// controllers/auth.controller.js
const authService = require('../services/auth.service');
const { registerSchema, loginSchema } = require('../validation/auth.validation'); // <-- TÁCH JOI SANG FILE RIÊNG

// Hàm xử lý lỗi chung (nên dùng hàm tái sử dụng)
const handleServiceError = (res, error) => {
    if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Lỗi server' });
};

// Đăng ký
exports.register = async (req, res) => {
    try {
        const { error, value } = registerSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const customer = await authService.registerCustomer(value);

        res.status(201).json({ message: 'Đăng ký thành công', customer });
    } catch (error) {
        handleServiceError(res, error);
    }
};

// Đăng nhập
exports.login = async (req, res) => {
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const result = await authService.loginCustomer(value);

        res.json(result);
    } catch (error) {
        handleServiceError(res, error);
    }
};

// Lấy hồ sơ
exports.getProfile = async (req, res) => {
    try {
        const customer = await authService.getCustomerProfile(req.customerId);
        res.json(customer);
    } catch (error) {
        handleServiceError(res, error);
    }
};

// Cập nhật hồ sơ
exports.updateProfile = async (req, res) => {
    try {
        // Chỉ validate các trường cho phép cập nhật tại đây
        const { ho_ten, so_dien_thoai } = req.body; 
        
        const customer = await authService.updateCustomerProfile(req.customerId, { ho_ten, so_dien_thoai });

        res.json({ message: 'Cập nhật thông tin thành công', customer });
    } catch (error) {
        handleServiceError(res, error);
    }
};