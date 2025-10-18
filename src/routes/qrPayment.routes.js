const express = require('express');
const router = express.Router();
const qrPaymentController = require('../controllers/qrPayment.controller');
const { authenticateToken, checkRole } = require('../middleware/auth');
const customerAuth = require('../middleware/customerAuth');

// Routes cho khách hàng
router.post('/bank/:id', customerAuth, qrPaymentController.createBankQRPayment);
router.post('/momo/:id', customerAuth, qrPaymentController.createMoMoQRPayment);
router.get('/status/:transactionId', qrPaymentController.checkPaymentStatus);
router.delete('/cancel/:transactionId', customerAuth, qrPaymentController.cancelTransaction);

// Loại bỏ toàn bộ route admin/detection liên quan xác nhận chuyển khoản ngân hàng

// Webhook từ MoMo
router.post('/webhook/momo', qrPaymentController.updateMoMoPaymentStatus);

module.exports = router;

