import prisma from "../prisma.js";

/**
 * 1. Tạo đơn hàng (POS)
 */
export const createOrder = async (req, res) => {
  const { items, tien_khach_dua } = req.body;
  const id_nhan_vien = req.user.id; // lấy từ JWT

  try {
    let tong_tien = 0;

    // Kiểm tra sản phẩm & tính tổng
    for (let item of items) {
      const sp = await prisma.san_pham.findUnique({
        where: { id: item.id_san_pham },
      });
      if (!sp) return res.status(400).json({ error: "Sản phẩm không tồn tại" });
      // Không cho mua nếu sản phẩm đang ngừng kinh doanh
      if (sp.trang_thai === "NGUNG_KINH_DOANH") {
        return res
          .status(400)
          .json({ error: `Sản phẩm ${sp.ten_san_pham} đang ngừng kinh doanh` });
      }
      if (sp.so_luong < item.so_luong) {
        return res
          .status(400)
          .json({ error: `Sản phẩm ${sp.ten_san_pham} không đủ tồn kho` });
      }
      tong_tien += sp.gia_ban * item.so_luong;
    }
    const tienKhachDua = Number(tien_khach_dua) || 0;
    const tienThoi = Math.max(0, tienKhachDua - tong_tien);
    // Tạo hóa đơn + chi tiết
    const hoaDon = await prisma.hoa_don_ban.create({
      data: {
        id_nhan_vien,
        tong_tien,
        tien_khach_dua: tienKhachDua, // LƯU VÀO DB
        tien_thoi: tienThoi, // LƯU VÀO DB
        chi_tiet: {
          create: items.map((item) => ({
            id_san_pham: item.id_san_pham,
            so_luong: item.so_luong,
            don_gia: item.don_gia || 0,
          })),
        },
      },
      include: { chi_tiet: true },
    });

    // Cập nhật tồn kho
    for (let item of items) {
      await prisma.san_pham.update({
        where: { id: item.id_san_pham },
        data: { so_luong: { decrement: item.so_luong } },
      });
    }

    return res.json({
      hoa_don_id: hoaDon.id,
      tong_tien,
      tien_khach_dua,
      tien_thoi: tien_khach_dua - tong_tien,
      chi_tiet: hoaDon.chi_tiet,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Lỗi khi tạo đơn hàng" });
  }
};

/**
 * 2. Lấy danh sách đơn hàng theo ngày (của nhân viên)
 */
export const getOrdersByDate = async (req, res) => {
  const id_nhan_vien = req.user.id;
  const { date } = req.query;

  try {
    const start = new Date(date + " 00:00:00");
    const end = new Date(date + " 23:59:59");

    const orders = await prisma.hoa_don_ban.findMany({
      where: {
        id_nhan_vien,
        ngay_ban: { gte: start, lte: end },
      },
      include: { chi_tiet: true },
      orderBy: { ngay_ban: "desc" },
    });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi lấy đơn hàng" });
  }
};

/**
 * 3. Xem chi tiết đơn hàng
 */
export const getOrderDetail = async (req, res) => {
  const { id } = req.params;
  const id_nhan_vien = req.user.id;

  try {
    const order = await prisma.hoa_don_ban.findFirst({
      where: { id: Number(id), id_nhan_vien },
      include: {
        chi_tiet: {
          include: { san_pham: true },
        },
      },
    });

    if (!order)
      return res.status(404).json({ error: "Không tìm thấy đơn hàng" });

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi lấy chi tiết đơn" });
  }
};

/**
 * 4. Bắt đầu ca làm
 */
export const startShift = async (req, res) => {
  const id_nhan_vien = req.user.id;

  try {
    const shift = await prisma.ca_lam.create({
      data: { id_nhan_vien },
    });

    res.json({ message: "Bắt đầu ca thành công", shift });
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi bắt đầu ca" });
  }
};

/**
 * 5. Kết thúc ca làm
 */
export const endShift = async (req, res) => {
  const id_nhan_vien = req.user.id;
  const { shiftId } = req.body;

  try {
    // Tính tổng đơn + doanh thu ca này
    const orders = await prisma.hoa_don_ban.findMany({
      where: { id_nhan_vien },
    });
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.tong_tien, 0);

    const shift = await prisma.ca_lam.update({
      where: { id: shiftId },
      data: {
        end_time: new Date(),
        total_orders: totalOrders,
        total_revenue: totalRevenue,
      },
    });

    res.json({ message: "Kết thúc ca thành công", shift });
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi kết thúc ca" });
  }
};
