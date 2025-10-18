const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const paymentController = require('../controllers/payment.controller');
const { authenticateToken, checkRole } = require('../middleware/auth');
const customerAuth = require('../middleware/customerAuth');

// Tạo URL thanh toán cho đơn hàng (chỉ admin hoặc hệ thống tạo sau khi customer đặt?)
// Ở đây cho phép admin lẫn hệ thống; bạn có thể thu hẹp nếu muốn
router.get('/vnpay/create/:id', authenticateToken, checkRole('quan_ly'), paymentController.createVnpayPayment);
router.get('/vnpay/create-customer/:id', customerAuth, paymentController.createVnpayPaymentCustomer);

// VNPay return URL (public do VNPay gọi)
router.get('/vnpay/return', paymentController.vnpayReturn);

module.exports = router;

// MoMo routes
router.get('/momo/create/:id', authenticateToken, checkRole('quan_ly'), paymentController.createMomoPayment);
router.get('/momo/create-customer/:id', customerAuth, paymentController.createMomoPaymentCustomer);
router.post('/momo/ipn', paymentController.momoIpn);
router.get('/momo/return', paymentController.momoReturn);

// Public payment config
router.get('/config/public', paymentController.getPublicConfig);

// Stripe (customer)
router.get('/stripe/create-customer/:id', customerAuth, paymentController.createStripePaymentCustomer);
router.post('/stripe/webhook', bodyParser.raw({ type: 'application/json' }), paymentController.stripeWebhook);
router.get('/paypal/create-customer/:id', customerAuth, paymentController.createPaypalOrderCustomer);

