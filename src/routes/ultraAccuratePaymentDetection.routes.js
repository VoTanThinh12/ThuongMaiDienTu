const express = require('express');
const router = express.Router();
const ultraAccuratePaymentDetectionController = require('../controllers/ultraAccuratePaymentDetection.controller');
const { authenticateToken, checkRole } = require('../middleware/auth');

// Tất cả routes đều yêu cầu authentication và role quan_ly
router.use(authenticateToken);
router.use(checkRole('quan_ly'));

// Khởi động hệ thống phát hiện siêu chính xác
router.post('/start', ultraAccuratePaymentDetectionController.startUltraAccurateDetection);

// Dừng hệ thống phát hiện siêu chính xác
router.post('/stop', ultraAccuratePaymentDetectionController.stopUltraAccurateDetection);

// Lấy trạng thái hệ thống
router.get('/status', ultraAccuratePaymentDetectionController.getUltraAccurateDetectionStatus);

// Test hệ thống
router.post('/test', ultraAccuratePaymentDetectionController.testUltraAccurateDetection);

module.exports = router;
