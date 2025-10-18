const express = require('express');
const router = express.Router();
const autoPaymentDetectionController = require('../controllers/autoPaymentDetection.controller');
const { authenticateToken, checkRole } = require('../middleware/auth');

// Routes cho admin
router.get('/status', authenticateToken, checkRole('quan_ly'), autoPaymentDetectionController.getSystemStatus);
router.post('/start', authenticateToken, checkRole('quan_ly'), autoPaymentDetectionController.startAutoDetection);
router.post('/stop', authenticateToken, checkRole('quan_ly'), autoPaymentDetectionController.stopAutoDetection);
router.post('/add-mock', authenticateToken, checkRole('quan_ly'), autoPaymentDetectionController.addMockTransaction);
router.post('/test-sms', authenticateToken, checkRole('quan_ly'), autoPaymentDetectionController.testSMSParsing);
router.post('/test-email', authenticateToken, checkRole('quan_ly'), autoPaymentDetectionController.testEmailParsing);
router.get('/history', authenticateToken, checkRole('quan_ly'), autoPaymentDetectionController.getAutoTransactionHistory);
router.get('/stats', authenticateToken, checkRole('quan_ly'), autoPaymentDetectionController.getAutoDetectionStats);

module.exports = router;

