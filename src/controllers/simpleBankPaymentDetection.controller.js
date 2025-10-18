const simpleBankPaymentDetectionService = require('../services/simpleBankPaymentDetection.service');

// Khởi động hệ thống phát hiện đơn giản
exports.startSimpleDetection = async (req, res) => {
  try {
    await simpleBankPaymentDetectionService.start();
    
    res.json({
      success: true,
      message: 'Hệ thống phát hiện thanh toán đơn giản đã được khởi động',
      data: simpleBankPaymentDetectionService.getStatus()
    });
  } catch (error) {
    console.error('Start simple detection error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi khởi động hệ thống phát hiện thanh toán' 
    });
  }
};

// Dừng hệ thống phát hiện đơn giản
exports.stopSimpleDetection = async (req, res) => {
  try {
    await simpleBankPaymentDetectionService.stop();
    
    res.json({
      success: true,
      message: 'Hệ thống phát hiện thanh toán đơn giản đã được dừng',
      data: simpleBankPaymentDetectionService.getStatus()
    });
  } catch (error) {
    console.error('Stop simple detection error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi dừng hệ thống phát hiện thanh toán' 
    });
  }
};

// Lấy trạng thái hệ thống
exports.getSimpleDetectionStatus = async (req, res) => {
  try {
    const status = simpleBankPaymentDetectionService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get simple detection status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi lấy trạng thái hệ thống phát hiện thanh toán' 
    });
  }
};


