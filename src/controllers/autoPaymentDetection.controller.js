const autoPaymentDetectionService = require('../services/autoPaymentDetection.service');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Lấy trạng thái hệ thống tự động phát hiện
exports.getSystemStatus = async (req, res) => {
  try {
    const status = autoPaymentDetectionService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get system status error:', error);
    res.status(500).json({ error: 'Lỗi lấy trạng thái hệ thống' });
  }
};

// Khởi động hệ thống tự động phát hiện
exports.startAutoDetection = async (req, res) => {
  try {
    autoPaymentDetectionService.startAutoDetection();
    
    res.json({
      success: true,
      message: 'Hệ thống tự động phát hiện đã được khởi động'
    });
  } catch (error) {
    console.error('Start auto detection error:', error);
    res.status(500).json({ error: 'Lỗi khởi động hệ thống' });
  }
};

// Dừng hệ thống tự động phát hiện
exports.stopAutoDetection = async (req, res) => {
  try {
    autoPaymentDetectionService.stopAutoDetection();
    
    res.json({
      success: true,
      message: 'Hệ thống tự động phát hiện đã được dừng'
    });
  } catch (error) {
    console.error('Stop auto detection error:', error);
    res.status(500).json({ error: 'Lỗi dừng hệ thống' });
  }
};

// Thêm giao dịch mẫu để test
exports.addMockTransaction = async (req, res) => {
  try {
    const mockTransaction = await autoPaymentDetectionService.addMockTransaction();
    
    if (mockTransaction) {
      res.json({
        success: true,
        data: mockTransaction,
        message: 'Đã thêm giao dịch mẫu để test'
      });
    } else {
      res.status(500).json({ error: 'Lỗi thêm giao dịch mẫu' });
    }
  } catch (error) {
    console.error('Add mock transaction error:', error);
    res.status(500).json({ error: 'Lỗi thêm giao dịch mẫu' });
  }
};

// Test SMS parsing
exports.testSMSParsing = async (req, res) => {
  try {
    const { smsContent } = req.body;
    
    if (!smsContent) {
      return res.status(400).json({ error: 'Nội dung SMS không được để trống' });
    }

    // Parse SMS content
    const transactionInfo = autoPaymentDetectionService.parseSMSContent(smsContent);
    
    res.json({
      success: true,
      data: {
        originalContent: smsContent,
        parsedInfo: transactionInfo
      }
    });
  } catch (error) {
    console.error('Test SMS parsing error:', error);
    res.status(500).json({ error: 'Lỗi test SMS parsing' });
  }
};

// Test Email parsing
exports.testEmailParsing = async (req, res) => {
  try {
    const { emailContent } = req.body;
    
    if (!emailContent) {
      return res.status(400).json({ error: 'Nội dung email không được để trống' });
    }

    // Parse Email content
    const transactionInfo = autoPaymentDetectionService.parseEmailContent(emailContent);
    
    res.json({
      success: true,
      data: {
        originalContent: emailContent,
        parsedInfo: transactionInfo
      }
    });
  } catch (error) {
    console.error('Test email parsing error:', error);
    res.status(500).json({ error: 'Lỗi test email parsing' });
  }
};

// Lấy lịch sử giao dịch tự động
exports.getAutoTransactionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const transactions = await prisma.giao_dich_ngan_hang.findMany({
      where: {
        nguoi_xac_nhan: {
          startsWith: 'AUTO_'
        }
      },
      include: {
        don_hang: {
          include: {
            khach_hang: true
          }
        }
      },
      orderBy: { thoi_gian_xac_nhan: 'desc' },
      skip: offset,
      take: parseInt(limit)
    });

    const total = await prisma.giao_dich_ngan_hang.count({
      where: {
        nguoi_xac_nhan: {
          startsWith: 'AUTO_'
        }
      }
    });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get auto transaction history error:', error);
    res.status(500).json({ error: 'Lỗi lấy lịch sử giao dịch tự động' });
  }
};

// Thống kê hệ thống tự động
exports.getAutoDetectionStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Thống kê theo ngày
    const todayStats = await prisma.giao_dich_ngan_hang.groupBy({
      by: ['nguoi_xac_nhan'],
      where: {
        thoi_gian_xac_nhan: {
          gte: today,
          lt: tomorrow
        },
        nguoi_xac_nhan: {
          startsWith: 'AUTO_'
        }
      },
      _count: {
        id: true
      }
    });

    // Thống kê tổng quan
    const totalStats = await prisma.giao_dich_ngan_hang.groupBy({
      by: ['nguoi_xac_nhan'],
      where: {
        nguoi_xac_nhan: {
          startsWith: 'AUTO_'
        }
      },
      _count: {
        id: true
      }
    });

    // Thống kê theo tuần
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekStats = await prisma.giao_dich_ngan_hang.groupBy({
      by: ['nguoi_xac_nhan'],
      where: {
        thoi_gian_xac_nhan: {
          gte: weekAgo
        },
        nguoi_xac_nhan: {
          startsWith: 'AUTO_'
        }
      },
      _count: {
        id: true
      }
    });

    res.json({
      success: true,
      data: {
        today: todayStats,
        week: weekStats,
        total: totalStats,
        systemStatus: autoPaymentDetectionService.getStatus()
      }
    });
  } catch (error) {
    console.error('Get auto detection stats error:', error);
    res.status(500).json({ error: 'Lỗi lấy thống kê hệ thống' });
  }
};

