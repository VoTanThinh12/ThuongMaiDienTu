// routes/auth.routes.js (Phiên bản mới)
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const customerAuth = require('../middleware/customerAuth'); // Auth Middleware của khách hàng

// Bỏ hết logic Joi, Prisma, bcrypt, JWT khỏi đây

// Đăng ký và Đăng nhập (Public)
router.post('/register', authController.register);
router.post('/login', authController.login);

// Lấy/Cập nhật thông tin khách hàng hiện tại (Protected)
router.get('/profile', customerAuth, authController.getProfile);
router.put('/profile', customerAuth, authController.updateProfile);

module.exports = router;