const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { authenticateToken, checkRole } = require("../middleware/auth");

// Bắt đầu ca làm
router.post(
  "/shifts/start",
  authenticateToken,
  checkRole(["thu_ngan"]),
  async (req, res) => {
    const shift = await prisma.ca_lam.create({
      data: { id_nhan_vien: req.user.id },
    });
    res.json({ message: "Bắt đầu ca", shift });
  }
);

// Kết thúc ca làm
router.post(
  "/shifts/end",
  authenticateToken,
  checkRole(["thu_ngan"]),
  async (req, res) => {
    const { shiftId } = req.body;
    const shift = await prisma.ca_lam.findUnique({
      where: { id: Number(shiftId) },
    });
    if (!shift || shift.id_nhan_vien !== req.user.id)
      return res.status(404).json({ error: "Không tìm thấy ca" });

    const whereOrders = {
      id_nhan_vien: req.user.id,
      ngay_ban: { gte: shift.start_time },
    };
    const orders = await prisma.hoa_don_ban.findMany({
      where: whereOrders,
      select: { tong_tien: true },
    });
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + Number(o.tong_tien), 0);

    const closed = await prisma.ca_lam.update({
      where: { id: Number(shiftId) },
      data: {
        end_time: new Date(),
        total_orders: totalOrders,
        total_revenue: totalRevenue,
      },
    });

    res.json({ message: "Kết thúc ca", shift: closed });
  }
);

module.exports = router;
