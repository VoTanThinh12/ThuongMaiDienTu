const express = require('express');
const router = express.Router();
const fullyAutoPaymentDetectionController = require('../controllers/fullyAutoPaymentDetection.controller');
const { authenticateToken, checkRole } = require('../middleware/auth');

// Tất cả routes đều yêu cầu authentication và role quan_ly
router.use(authenticateToken);
router.use(checkRole('quan_ly'));

// Khởi động hệ thống TỰ ĐỘNG HOÀN TOÀN
router.post('/start', fullyAutoPaymentDetectionController.startFullyAutoDetection);

// Dừng hệ thống TỰ ĐỘNG HOÀN TOÀN
router.post('/stop', fullyAutoPaymentDetectionController.stopFullyAutoDetection);

// Lấy trạng thái hệ thống
router.get('/status', fullyAutoPaymentDetectionController.getFullyAutoDetectionStatus);

module.exports = router;





