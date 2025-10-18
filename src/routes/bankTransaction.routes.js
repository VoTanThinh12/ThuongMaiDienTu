const express = require('express');
const router = express.Router();
const bankTransactionController = require('../controllers/bankTransaction.controller');
const authMiddleware = require('../middleware/auth');

// Tất cả routes đều yêu cầu authentication
router.use(authMiddleware.authenticateToken);

// Lấy tất cả giao dịch ngân hàng
router.get('/', bankTransactionController.getAllBankTransactions);

// Lấy thống kê giao dịch
router.get('/stats', bankTransactionController.getBankTransactionStats);

// Lấy chi tiết giao dịch
router.get('/:transactionId', bankTransactionController.getBankTransactionDetail);

// Lấy giao dịch theo đơn hàng
router.get('/order/:orderId', bankTransactionController.getBankTransactionsByOrder);

// Xác nhận giao dịch
router.post('/:transactionId/verify', bankTransactionController.verifyBankTransaction);

// Từ chối giao dịch
router.post('/:transactionId/reject', bankTransactionController.rejectBankTransaction);

// Xuất báo cáo
router.get('/export/report', bankTransactionController.exportBankTransactions);

module.exports = router;

