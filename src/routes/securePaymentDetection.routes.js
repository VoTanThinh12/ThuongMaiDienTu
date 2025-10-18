const express = require('express');
const router = express.Router();
const securePaymentDetectionController = require('../controllers/securePaymentDetection.controller');
const { authenticateToken, checkRole } = require('../middleware/auth');

// Tất cả routes đều yêu cầu authentication và role quan_ly
router.use(authenticateToken);
router.use(checkRole('quan_ly'));

// Khởi động hệ thống AN TOÀN 100%
router.post('/start', securePaymentDetectionController.startSecureDetection);

// Dừng hệ thống AN TOÀN 100%
router.post('/stop', securePaymentDetectionController.stopSecureDetection);

// Lấy trạng thái hệ thống
router.get('/status', securePaymentDetectionController.getSecureDetectionStatus);

module.exports = router;





