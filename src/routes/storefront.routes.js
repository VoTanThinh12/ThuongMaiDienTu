// routes/storefront.routes.js (Đã ổn)
const express = require('express');
const router = express.Router();
const storefrontController = require('../controllers/storefront.controller');

// Public routes - không cần auth
router.get('/products', storefrontController.getProducts);
router.get('/products/:id', storefrontController.getProductDetail);
router.get('/suggestions', storefrontController.getSuggestions);

module.exports = router;