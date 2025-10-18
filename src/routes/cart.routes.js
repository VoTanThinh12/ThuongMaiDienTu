const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const customerAuth = require('../middleware/customerAuth');

// Tất cả routes đều cần auth
router.use(customerAuth);

router.get('/', cartController.getCart);
router.post('/add', cartController.addToCart);
router.put('/:id', cartController.updateCartItem);
router.delete('/:id', cartController.removeFromCart);
router.delete('/', cartController.clearCart);

module.exports = router;