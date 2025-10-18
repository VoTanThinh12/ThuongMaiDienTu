const express = require('express');
const router = express.Router();
const simpleBankPaymentDetectionController = require('../controllers/simpleBankPaymentDetection.controller');
const { authenticateToken, checkRole } = require('../middleware/auth');

// Tất cả routes đều yêu cầu authentication và role quan_ly
router.use(authenticateToken);
router.use(checkRole('quan_ly'));

// Khởi động hệ thống phát hiện đơn giản
router.post('/start', simpleBankPaymentDetectionController.startSimpleDetection);

// Dừng hệ thống phát hiện đơn giản
router.post('/stop', simpleBankPaymentDetectionController.stopSimpleDetection);

// Lấy trạng thái hệ thống
router.get('/status', simpleBankPaymentDetectionController.getSimpleDetectionStatus);

module.exports = router;


