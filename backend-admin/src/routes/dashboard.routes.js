// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateToken } = require('../middleware/auth');

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    // === CÁC THỐNG KÊ CŨ (GIỮ NGUYÊN) ===
    const totalProducts = await prisma.san_pham.count();
    const totalEmployees = await prisma.nhan_vien.count();
    const totalInvoices = await prisma.hoa_don_ban.count();
    const revenueResult = await prisma.hoa_don_ban.aggregate({
      _sum: { tong_tien: true },
    });
    const totalRevenue = revenueResult._sum.tong_tien || 0;
    const stockByTypeRaw = await prisma.san_pham.groupBy({
      by: ['don_vi_tinh'],
      _sum: { so_luong: true },
    });
    const stockByType = stockByTypeRaw.map((item) => ({
      type: item.don_vi_tinh || 'Không xác định',
      value: item._sum.so_luong || 0,
    }));
    const lastSale = await prisma.hoa_don_ban.findFirst({
      orderBy: { ngay_ban: 'desc' },
    });
    let dailyRevenue = [];
    if (lastSale) {
      const endDate = new Date(lastSale.ngay_ban);
      endDate.setUTCHours(23, 59, 59, 999);
      const startDate = new Date(endDate);
      startDate.setUTCDate(startDate.getUTCDate() - 6);
      startDate.setUTCHours(0, 0, 0, 0);
      const dailyRevenueRaw = await prisma.$queryRaw`
        SELECT DATE(ngay_ban) AS date, SUM(tong_tien) AS revenue
        FROM hoa_don_ban
        WHERE ngay_ban BETWEEN ${startDate.toISOString()} AND ${endDate.toISOString()}
        GROUP BY DATE(ngay_ban)
        ORDER BY date ASC
      `;
      dailyRevenue = dailyRevenueRaw.map(item => ({
        ...item,
        revenue: Number(item.revenue)
      }));
    }
    const topSellingProductsRaw = await prisma.$queryRaw`
      SELECT 
        p.ten_san_pham, 
        SUM(ct.so_luong) as total_sold
      FROM chi_tiet_hoa_don_ban AS ct
      JOIN san_pham AS p ON ct.id_san_pham = p.id
      GROUP BY p.ten_san_pham
      ORDER BY total_sold DESC
      LIMIT 5
    `;
    const topSellingProducts = topSellingProductsRaw.map(p => ({
      name: p.ten_san_pham,
      sold: Number(p.total_sold),
    }));
    const LOW_STOCK_THRESHOLD = 20;
    const lowStockProducts = await prisma.san_pham.findMany({
      where: {
        so_luong: {
          lt: LOW_STOCK_THRESHOLD,
        },
      },
      orderBy: {
        so_luong: 'asc',
      },
      take: 5,
      select: {
        ten_san_pham: true,
        so_luong: true,
      },
    });

    // =================================================================
    // <<< THÊM CHỨC NĂNG MỚI TẠI ĐÂY >>>
    // =================================================================

    // === MỚI: Nhân viên của tháng ===
// === MỚI: Top 3 Nhân viên của tháng ===
const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

// Lấy danh sách nhân viên có doanh thu cao nhất
const topEmployeesResult = await prisma.hoa_don_ban.groupBy({
    by: ['id_nhan_vien'],
    _sum: { tong_tien: true },
    where: {
        id_nhan_vien: { not: null },
        ngay_ban: { gte: currentMonthStart }
    },
    orderBy: { _sum: { tong_tien: 'desc' } },
    take: 3, // Lấy top 3 thay vì 1
});

let topEmployees = []; // Đổi tên thành số nhiều

if (topEmployeesResult.length > 0) {
    // Lấy ID của các nhân viên top đầu
    const employeeIds = topEmployeesResult.map(item => item.id_nhan_vien);

    // Tìm thông tin (tên) của các nhân viên đó trong 1 lần query
    const employees = await prisma.nhan_vien.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, ho_ten: true }
    });

    // Tạo một map để dễ dàng tra cứu tên từ ID
    const employeeMap = new Map(employees.map(e => [e.id, e.ho_ten]));

    // Kết hợp kết quả doanh thu và tên nhân viên
    topEmployees = topEmployeesResult.map(result => ({
        name: employeeMap.get(result.id_nhan_vien) || 'Nhân viên đã bị xóa',
        revenue: result._sum.tong_tien || 0,
    }));
}

    // === MỚI: Hoạt động gần đây ===
    const recentSales = await prisma.hoa_don_ban.findMany({
        take: 3,
        orderBy: { ngay_ban: 'desc' },
        include: { nhan_vien: { select: { ho_ten: true } } }
    });
    const recentPurchases = await prisma.phieu_nhap.findMany({
        take: 3,
        orderBy: { ngay_nhap: 'desc' },
        include: { nhan_vien: { select: { ho_ten: true } } }
    });

    const salesActivities = recentSales.map(sale => ({
        type: 'sale',
        date: sale.ngay_ban,
        description: `${sale.nhan_vien?.ho_ten || 'N/A'} vừa tạo một hóa đơn trị giá ${new Intl.NumberFormat('vi-VN').format(sale.tong_tien)}₫.`
    }));
    const purchaseActivities = recentPurchases.map(purchase => ({
        type: 'purchase',
        date: purchase.ngay_nhap,
        description: `${purchase.nhan_vien?.ho_ten || 'N/A'} vừa tạo một phiếu nhập hàng.`
    }));
    
    const recentActivities = [...salesActivities, ...purchaseActivities]
        .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sắp xếp theo ngày mới nhất
        .slice(0, 5); // Lấy 5 hoạt động gần nhất


    // === TRẢ VỀ DỮ LIỆU ĐÃ MỞ RỘNG ===
    res.json({
      stats: {
        totalProducts,
        totalEmployees,
        totalInvoices,
        totalRevenue,
      },
      charts: {
        dailyRevenue,
        stockByType,
      },
      topSellingProducts,
      lowStockProducts: lowStockProducts.map(p => ({ name: p.ten_san_pham, quantity: p.so_luong })),
      // Thêm dữ liệu mới
      topEmployees,
      recentActivities,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy dữ liệu dashboard' });
  }
});

module.exports = router;