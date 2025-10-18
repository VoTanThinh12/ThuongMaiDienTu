const fullyAutoPaymentDetectionService = require('../services/fullyAutoPaymentDetection.service');

// Khởi động hệ thống TỰ ĐỘNG HOÀN TOÀN
exports.startFullyAutoDetection = async (req, res) => {
  try {
    await fullyAutoPaymentDetectionService.start();
    
    res.json({
      success: true,
      message: 'Hệ thống TỰ ĐỘNG HOÀN TOÀN đã được khởi động! Khách hàng chuyển tiền xong là TỰ ĐỘNG báo thành công!',
      data: fullyAutoPaymentDetectionService.getStatus()
    });
  } catch (error) {
    console.error('Start fully auto detection error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi khởi động hệ thống TỰ ĐỘNG HOÀN TOÀN' 
    });
  }
};

// Dừng hệ thống TỰ ĐỘNG HOÀN TOÀN
exports.stopFullyAutoDetection = async (req, res) => {
  try {
    await fullyAutoPaymentDetectionService.stop();
    
    res.json({
      success: true,
      message: 'Hệ thống TỰ ĐỘNG HOÀN TOÀN đã được dừng',
      data: fullyAutoPaymentDetectionService.getStatus()
    });
  } catch (error) {
    console.error('Stop fully auto detection error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi dừng hệ thống TỰ ĐỘNG HOÀN TOÀN' 
    });
  }
};

// Lấy trạng thái hệ thống
exports.getFullyAutoDetectionStatus = async (req, res) => {
  try {
    const status = fullyAutoPaymentDetectionService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get fully auto detection status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi lấy trạng thái hệ thống TỰ ĐỘNG HOÀN TOÀN' 
    });
  }
};





