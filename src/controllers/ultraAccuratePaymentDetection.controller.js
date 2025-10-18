const ultraAccuratePaymentDetectionService = require('../services/ultraAccuratePaymentDetection.service');

// Khởi động hệ thống phát hiện siêu chính xác
exports.startUltraAccurateDetection = async (req, res) => {
  try {
    await ultraAccuratePaymentDetectionService.start();
    
    res.json({
      success: true,
      message: 'Hệ thống phát hiện siêu chính xác đã được khởi động',
      data: ultraAccuratePaymentDetectionService.getStatus()
    });
  } catch (error) {
    console.error('Start ultra accurate detection error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi khởi động hệ thống phát hiện siêu chính xác' 
    });
  }
};

// Dừng hệ thống phát hiện siêu chính xác
exports.stopUltraAccurateDetection = async (req, res) => {
  try {
    await ultraAccuratePaymentDetectionService.stop();
    
    res.json({
      success: true,
      message: 'Hệ thống phát hiện siêu chính xác đã được dừng',
      data: ultraAccuratePaymentDetectionService.getStatus()
    });
  } catch (error) {
    console.error('Stop ultra accurate detection error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi dừng hệ thống phát hiện siêu chính xác' 
    });
  }
};

// Lấy trạng thái hệ thống
exports.getUltraAccurateDetectionStatus = async (req, res) => {
  try {
    const status = ultraAccuratePaymentDetectionService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get ultra accurate detection status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi lấy trạng thái hệ thống phát hiện siêu chính xác' 
    });
  }
};

// Test hệ thống với giao dịch mẫu
exports.testUltraAccurateDetection = async (req, res) => {
  try {
    // Tạo giao dịch test
    const testTransaction = {
      ma_giao_dich: `test_${Date.now()}`,
      ma_don_hang: `TEST_${Date.now()}`,
      so_tien: 100000,
      trang_thai: 'cho_xac_nhan',
      thoi_gian_tao: new Date(),
      thoi_gian_het_han: new Date(Date.now() + 60000) // 1 phút
    };

    // Test verification logic
    const result = await ultraAccuratePaymentDetectionService.verifyTransaction(testTransaction);
    
    res.json({
      success: true,
      message: 'Test hệ thống phát hiện siêu chính xác thành công',
      data: {
        testTransaction,
        result
      }
    });
  } catch (error) {
    console.error('Test ultra accurate detection error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi test hệ thống phát hiện siêu chính xác' 
    });
  }
};


