const securePaymentDetectionService = require('../services/securePaymentDetection.service');

// Khởi động hệ thống AN TOÀN 100%
exports.startSecureDetection = async (req, res) => {
  try {
    await securePaymentDetectionService.start();
    
    res.json({
      success: true,
      message: 'Hệ thống AN TOÀN 100% đã được khởi động! CHỈ XÁC NHẬN KHI THẬT SỰ CÓ TIỀN!',
      data: securePaymentDetectionService.getStatus()
    });
  } catch (error) {
    console.error('Start secure detection error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi khởi động hệ thống AN TOÀN 100%' 
    });
  }
};

// Dừng hệ thống AN TOÀN 100%
exports.stopSecureDetection = async (req, res) => {
  try {
    await securePaymentDetectionService.stop();
    
    res.json({
      success: true,
      message: 'Hệ thống AN TOÀN 100% đã được dừng',
      data: securePaymentDetectionService.getStatus()
    });
  } catch (error) {
    console.error('Stop secure detection error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi dừng hệ thống AN TOÀN 100%' 
    });
  }
};

// Lấy trạng thái hệ thống
exports.getSecureDetectionStatus = async (req, res) => {
  try {
    const status = securePaymentDetectionService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get secure detection status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi lấy trạng thái hệ thống AN TOÀN 100%' 
    });
  }
};





