const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { authenticateToken, checkRole } = require("../middleware/auth");

// Báo cáo doanh thu theo khoảng thời gian — chỉ quản lý
router.get(
  "/doanhthu",
  authenticateToken,
  checkRole("quan_ly"),
  async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Thiếu tham số startDate hoặc endDate" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Khoảng thời gian không hợp lệ." });
    }

    try {
      const doanhThu = await prisma.hoa_don_ban.aggregate({
        _sum: { tong_tien: true },
        where: {
          ngay_ban: {
            gte: start,
            lte: end,
          },
        },
      });
      res.json({ tong_doanh_thu: doanhThu._sum.tong_tien || 0 });
    } catch (error) {
      console.error("Lỗi báo cáo doanh thu:", error);
      res.status(500).json({ error: "Lỗi khi tính doanh thu" });
    }
  }
);

// Báo cáo tồn kho — quản lý và nhân viên đều xem được
router.get(
  "/tonkho",
  authenticateToken,
  checkRole(["quan_ly", "nhan_vien"]),
  async (req, res) => {
    try {
      const tonKho = await prisma.san_pham.findMany({
        select: {
          id: true,
          ten_san_pham: true,
          ma_san_pham: true,
          so_luong: true,
          gia_ban: true,
        },
      });
      res.json(tonKho);
    } catch (error) {
      console.error("Lỗi báo cáo tồn kho:", error);
      res.status(500).json({ error: "Lỗi khi lấy báo cáo tồn kho" });
    }
  }
);

// Báo cáo hiệu suất nhân viên — chỉ quản lý
router.get(
  "/hieusuatnhanvien",
  authenticateToken,
  checkRole("quan_ly"),
  async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "Thiếu tham số startDate hoặc endDate" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Khoảng thời gian không hợp lệ." });
    }

    try {
      const hieuSuatGrouped = await prisma.hoa_don_ban.groupBy({
        by: ["id_nhan_vien"],
        _count: { id: true },
        _sum: { tong_tien: true },
        where: {
          ngay_ban: {
            gte: start,
            lte: end,
          },
          id_nhan_vien: {
            not: null,
          },
        },
      });

      if (hieuSuatGrouped.length === 0) {
        return res.json([]);
      }

      const employeeIds = hieuSuatGrouped.map((item) => item.id_nhan_vien);
      const employees = await prisma.nhan_vien.findMany({
        where: {
          id: { in: employeeIds },
        },
        select: {
          id: true,
          ho_ten: true,
        },
      });

      const employeeMap = new Map(employees.map((emp) => [emp.id, emp]));

      const hieuSuat = hieuSuatGrouped.map((item) => ({
        ...item,
        nhan_vien: employeeMap.get(item.id_nhan_vien) || null,
        so_hoa_don: item._count.id,
        tong_doanh_thu: item._sum.tong_tien,
        id_nhan_vien: item.id_nhan_vien,
      }));

      res.json(hieuSuat);
    } catch (error) {
      console.error("Lỗi báo cáo hiệu suất nhân viên:", error);
      res
        .status(500)
        .json({ error: "Lỗi khi lấy báo cáo hiệu suất nhân viên" });
    }
  }
);

module.exports = router;
