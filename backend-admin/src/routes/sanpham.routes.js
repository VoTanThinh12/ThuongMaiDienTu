const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { authenticateToken, checkRole } = require("../middleware/auth");
const Joi = require("joi");

const sanPhamSchema = Joi.object({
  ten_san_pham: Joi.string().max(100).required().messages({
    "string.empty": "Tên sản phẩm không được để trống",
    "string.max": "Tên sản phẩm không được vượt quá 100 ký tự",
  }),
  ma_san_pham: Joi.string().max(50).required().messages({
    "string.empty": "Mã sản phẩm không được để trống",
    "string.max": "Mã sản phẩm không được vượt quá 50 ký tự",
  }),
  don_vi_tinh: Joi.string().max(50).required().messages({
    "string.empty": "Đơn vị tính không được để trống",
    "string.max": "Đơn vị tính không được vượt quá 50 ký tự",
  }),
  gia_ban: Joi.number().positive().required().messages({
    "number.base": "Giá bán phải là số",
    "number.positive": "Giá bán phải lớn hơn 0",
  }),
  so_luong: Joi.number().integer().min(0).required().messages({
    "number.base": "Số lượng phải là số nguyên",
    "number.min": "Số lượng không được âm",
  }),
});

// GET: Danh sách sản phẩm (quản lý + nhân viên)
router.get(
  "/",
  authenticateToken,
  checkRole(["quan_ly", "nhan_vien", "thu_ngan"]),
  async (req, res) => {
    try {
      const includeHidden = String(req.query.include_hidden || "false").toLowerCase() === "true";
      const whereClause = includeHidden
        ? { trang_thai: { in: ["AN", "NGUNG_KINH_DOANH"] } }
        : { NOT: { trang_thai: { in: ["AN", "NGUNG_KINH_DOANH"] } } };
      const sanpham = await prisma.san_pham.findMany({ where: whereClause });
      res.json(sanpham);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sản phẩm:", error);
      res.status(500).json({ error: "Lỗi server khi lấy danh sách sản phẩm" });
    }
  }
);

// POST: Thêm sản phẩm (chỉ quản lý)
router.post("/", authenticateToken, checkRole("quan_ly"), async (req, res) => {
  const { error, value } = sanPhamSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res
      .status(400)
      .json({ errors: error.details.map((e) => e.message) });
  }
  try {
    const sp = await prisma.san_pham.create({
      data: {
        ten_san_pham: value.ten_san_pham,
        ma_san_pham: value.ma_san_pham,
        don_vi_tinh: value.don_vi_tinh,
        gia_ban: parseFloat(value.gia_ban),
        so_luong: parseInt(value.so_luong),
      },
    });
    res.json(sp);
  } catch (error) {
    console.error("Lỗi khi thêm sản phẩm:", error);
    res.status(500).json({ error: "Lỗi khi thêm sản phẩm: " + error.message });
  }
});

// PUT: Cập nhật sản phẩm (chỉ quản lý)
router.put(
  "/:id",
  authenticateToken,
  checkRole("quan_ly"),
  async (req, res) => {
    const { id } = req.params;
    const { error, value } = sanPhamSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res
        .status(400)
        .json({ errors: error.details.map((e) => e.message) });
    }
    try {
      const sp = await prisma.san_pham.update({
        where: { id: Number(id) },
        data: {
          ten_san_pham: value.ten_san_pham,
          ma_san_pham: value.ma_san_pham,
          don_vi_tinh: value.don_vi_tinh,
          gia_ban: parseFloat(value.gia_ban),
          so_luong: parseInt(value.so_luong),
        },
      });
      res.json(sp);
    } catch (error) {
      console.error("Lỗi khi cập nhật sản phẩm:", error);
      res
        .status(500)
        .json({ error: "Lỗi khi cập nhật sản phẩm: " + error.message });
    }
  }
);

// DELETE: Xóa sản phẩm (chỉ quản lý)
router.delete(
  "/:id",
  authenticateToken,
  checkRole("quan_ly"),
  async (req, res) => {
    const { id } = req.params;
    const { trang_thai } = req.body || {};
    try {
      if (trang_thai === "AN" || trang_thai === "NGUNG_KINH_DOANH") {
        const sp = await prisma.san_pham.update({
          where: { id: Number(id) },
          data: { trang_thai },
        });
        return res.json(sp);
      }

      // Nếu không truyền trạng thái, không cho phép xóa cứng để tránh mất dữ liệu
      return res.status(400).json({ error: "Thiếu hoặc không hợp lệ 'trang_thai' để xóa mềm" });
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái/xóa sản phẩm:", error);
      res.status(500).json({ error: "Lỗi khi xử lý sản phẩm: " + error.message });
    }
  }
);

// PATCH: Khôi phục sản phẩm về trạng thái đang kinh doanh
router.patch(
  "/:id/restore",
  authenticateToken,
  checkRole("quan_ly"),
  async (req, res) => {
    const { id } = req.params;
    try {
      const sp = await prisma.san_pham.update({
        where: { id: Number(id) },
        data: { trang_thai: "DANG_KINH_DOANH" },
      });
      res.json(sp);
    } catch (error) {
      console.error("Lỗi khi khôi phục sản phẩm:", error);
      res.status(500).json({ error: "Lỗi khi khôi phục sản phẩm: " + error.message });
    }
  }
);

module.exports = router;
