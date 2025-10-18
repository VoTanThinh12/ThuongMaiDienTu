const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const customerAuth = require('../middleware/customerAuth');
const { authenticateToken, checkRole } = require('../middleware/auth');

// Customer routes
router.post('/', customerAuth, orderController.createOrder);
router.get('/my-orders', customerAuth, orderController.getMyOrders);
router.get('/:id', customerAuth, orderController.getOrderDetail);
router.put('/:id/cancel', customerAuth, orderController.cancelOrder);
router.put('/:id', customerAuth, orderController.updateOrder);

// Admin routes
router.get('/admin/all', authenticateToken, checkRole('quan_ly'), orderController.getAllOrders);
router.put('/admin/:id/status', authenticateToken, checkRole('quan_ly'), orderController.updateOrderStatus);

module.exports = router;