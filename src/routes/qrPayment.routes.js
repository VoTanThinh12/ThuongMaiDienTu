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

// 🚀 NEW: Bank Webhook - Nhận thông báo từ gateway khi có chuyển khoản
router.post('/webhook/bank', qrPaymentController.handleBankWebhook);

// Webhook từ MoMo
router.post('/webhook/momo', qrPaymentController.updateMoMoPaymentStatus);

// 🎯 Admin route: Manual verify transaction (backup plan)
router.post('/admin/verify/:transactionId', authenticateToken, checkRole(['admin']), qrPaymentController.manualVerifyTransaction);

module.exports = router;