// const express = require("express");
// const router = express.Router();
// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();
// const { authenticateToken, checkRole } = require("../middleware/auth");
// const Joi = require("joi");

// const nhanVienSchema = Joi.object({
//   ho_ten: Joi.string().max(100).required().messages({
//     "string.empty": "Họ tên không được để trống",
//     "string.max": "Họ tên không được vượt quá 100 ký tự",
//   }),
//   tai_khoan: Joi.string().max(50).required().messages({
//     "string.empty": "Tài khoản không được để trống",
//     "string.max": "Tài khoản không được vượt quá 50 ký tự",
//   }),
//   // Mật khẩu là tùy chọn khi cập nhật, nhưng bắt buộc khi tạo mới
//   mat_khau: Joi.string().min(6).max(100).optional().allow(null, "").messages({
//     "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
//     "string.max": "Mật khẩu không được vượt quá 100 ký tự",
//   }),
//   vai_tro: Joi.string()
//     .valid("quan_ly", "thu_ngan", "nhan_vien_kho")
//     .required()
//     .messages({
//       "any.only": 'Vai trò phải là "quan_ly", "thu_ngan" hoặc "nhan_vien_kho"',
//       "string.empty": "Vai trò không được để trống",
//     }),
//   // Sửa giá trị cho khớp với database ('Đang làm', 'Đã nghỉ')
//   trang_thai: Joi.string().valid("Đang làm", "Đã nghỉ").required().messages({
//     "any.only": 'Trạng thái phải là "Đang làm" hoặc "Đã nghỉ"',
//     "string.empty": "Trạng thái không được để trống",
//   }),
//   so_dien_thoai: Joi.string()
//     .pattern(/^[0-9]{10,11}$/)
//     .optional()
//     .allow(null, "")
//     .messages({
//       "string.pattern.base": "Số điện thoại phải có 10-11 chữ số",
//     }),
//   dia_chi: Joi.string().optional().allow(null, ""),
//   email: Joi.string().email().optional().allow(null, "").messages({
//     "string.email": "Email không hợp lệ",
//   }),
//   ngay_sinh: Joi.date().iso().optional().allow(null, ""),
//   ngay_vao_lam: Joi.date().iso().optional().allow(null, ""),
// });

// // Lấy danh sách nhân viên — chỉ quản lý
// router.get("/", authenticateToken, checkRole("quan_ly"), async (req, res) => {
//   try {
//     const nhanviens = await prisma.nhan_vien.findMany();
//     res.json(nhanviens);
//   } catch (error) {
//     console.error("Lỗi khi lấy danh sách nhân viên:", error);
//     res.status(500).json({ error: "Lỗi server khi lấy danh sách nhân viên" });
//   }
// });

// // Thêm nhân viên — chỉ quản lý
// router.post("/", authenticateToken, checkRole("quan_ly"), async (req, res) => {
//   const { error, value } = nhanVienSchema.validate(req.body, {
//     abortEarly: false,
//   });
//   if (error) {
//     return res
//       .status(400)
//       .json({ errors: error.details.map((e) => e.message) });
//   }
//   try {
//     const nv = await prisma.nhan_vien.create({
//       data: {
//         ho_ten: value.hoTen,
//         so_dien_thoai: value.soDienThoai,
//         dia_chi: value.diaChi,
//         email: value.email,
//         ngay_sinh: value.ngaySinh ? new Date(value.ngaySinh) : null,
//         ngay_vao_lam: value.ngayVaoLam ? new Date(value.ngayVaoLam) : null,
//         trang_thai: value.trangThai === "Đang làm",
//       },
//     });
//     res.json(nv);
//   } catch (error) {
//     console.error("Lỗi khi thêm nhân viên:", error);
//     res.status(400).json({ error: "Lỗi khi thêm nhân viên: " + error.message });
//   }
// });

// // Cập nhật nhân viên — chỉ quản lý
// router.put(
//   "/:id",
//   authenticateToken,
//   checkRole("quan_ly"),
//   async (req, res) => {
//     const { id } = req.params;
//     const { error, value } = nhanVienSchema.validate(req.body, {
//       abortEarly: false,
//     });
//     if (error) {
//       return res
//         .status(400)
//         .json({ errors: error.details.map((e) => e.message) });
//     }
//     try {
//       const nv = await prisma.nhan_vien.update({
//         where: { id: parseInt(id) },
//         data: {
//           ho_ten: value.hoTen,
//           so_dien_thoai: value.soDienThoai,
//           dia_chi: value.diaChi,
//           email: value.email,
//           ngay_sinh: value.ngaySinh ? new Date(value.ngaySinh) : null,
//           ngay_vao_lam: value.ngayVaoLam ? new Date(value.ngayVaoLam) : null,
//           trang_thai: value.trangThai === "Đang làm",
//         },
//       });
//       res.json(nv);
//     } catch (error) {
//       console.error("Lỗi khi cập nhật nhân viên:", error);
//       res
//         .status(400)
//         .json({ error: "Lỗi khi cập nhật nhân viên: " + error.message });
//     }
//   }
// );

// // Xóa nhân viên — chỉ quản lý
// router.delete(
//   "/:id",
//   authenticateToken,
//   checkRole("quan_ly"),
//   async (req, res) => {
//     const { id } = req.params;
//     try {
//       await prisma.nhan_vien.delete({ where: { id: parseInt(id) } });
//       res.json({ message: "Đã xóa nhân viên" });
//     } catch (error) {
//       console.error("Lỗi khi xóa nhân viên:", error);
//       res
//         .status(400)
//         .json({ error: "Lỗi khi xóa nhân viên: " + error.message });
//     }
//   }
// );

// module.exports = router;
// nhanvien.routes.js - Backend sửa lỗi

const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { authenticateToken, checkRole } = require("../middleware/auth");
const Joi = require("joi");
const bcrypt = require("bcrypt");

const nhanVienSchema = Joi.object({
  tai_khoan: Joi.string().max(50).required().messages({
    "string.empty": "Tài khoản không được để trống",
    "string.max": "Tài khoản không được vượt quá 50 ký tự",
  }),
  mat_khau: Joi.string().min(6).max(1000).optional().allow("").messages({
    "string.min": "Mật khẩu phải có ít nhất 6 ký tự",
    "string.max": "Mật khẩu không được vượt quá 50 ký tự",
  }),
  vai_tro: Joi.string()
    .valid("quan_ly", "thu_ngan", "nhan_vien_kho")
    .default("quan_ly")
    .messages({
      "any.only": 'Vai trò phải là "quan_ly", "thu_ngan" hoặc "nhan_vien_kho"',
    }),
  ho_ten: Joi.string().max(100).required().messages({
    "string.empty": "Họ tên không được để trống",
    "string.max": "Họ tên không được vượt quá 100 ký tự",
  }),
  so_dien_thoai: Joi.string()
    .pattern(/^[0-9]{10,11}$/)
    .optional()
    .allow(null, "")
    .messages({
      "string.pattern.base": "Số điện thoại phải có 10-11 chữ số",
    }),
  dia_chi: Joi.string().allow(null, "").optional(),
  email: Joi.string().email().optional().allow(null, "").messages({
    "string.email": "Email không hợp lệ",
  }),
  ngay_sinh: Joi.date().iso().optional().allow(null, "").messages({
    "date.base": "Ngày sinh phải là định dạng ISO 8601 hợp lệ",
  }),
  ngay_vao_lam: Joi.date().iso().optional().allow(null, "").messages({
    "date.base": "Ngày vào làm phải là định dạng ISO 8601 hợp lệ",
  }),
  trang_thai: Joi.string()
    .valid("Dang_lam", "Da_nghi")
    .default("Dang_lam")
    .messages({
      "any.only": 'Trạng thái phải là "Dang_lam" hoặc "Da_nghi"',
    }),
});

// Lấy danh sách nhân viên — chỉ quản lý
router.get("/", authenticateToken, checkRole("quan_ly"), async (req, res) => {
  try {
    const nhanviens = await prisma.nhan_vien.findMany();
    res.json(nhanviens);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách nhân viên:", error);
    res.status(500).json({ error: "Lỗi server khi lấy danh sách nhân viên" });
  }
});

router.post("/", authenticateToken, checkRole("quan_ly"), async (req, res) => {
  const { error, value } = nhanVienSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res
      .status(400)
      .json({ errors: error.details.map((e) => e.message) });
  }

  if (!value.mat_khau) {
    return res.status(400).json({ errors: ["Mật khẩu không được để trống"] });
  }

  try {
    // Kiểm tra tính duy nhất
    const existingNhanVien = await prisma.nhan_vien.findFirst({
      where: {
        OR: [
          { tai_khoan: value.tai_khoan },
          value.email ? { email: value.email } : {},
        ],
      },
    });
    if (existingNhanVien) {
      return res.status(409).json({ error: "Tài khoản hoặc email đã tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(value.mat_khau, 10);
    const nv = await prisma.nhan_vien.create({
      data: {
        tai_khoan: value.tai_khoan,
        mat_khau: hashedPassword,
        vai_tro: value.vai_tro,
        ho_ten: value.ho_ten,
        so_dien_thoai: value.so_dien_thoai || null,
        dia_chi: value.dia_chi || null,
        email: value.email || null,
        ngay_sinh: value.ngay_sinh ? new Date(value.ngay_sinh) : null,
        ngay_vao_lam: value.ngay_vao_lam ? new Date(value.ngay_vao_lam) : null,
        trang_thai: value.trang_thai,
      },
    });
    res.status(201).json(nv);
  } catch (error) {
    console.error("Lỗi khi thêm nhân viên:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Tài khoản hoặc email đã tồn tại" });
    }
    res.status(500).json({ error: "Lỗi server khi thêm nhân viên" });
  }
});

// Cập nhật nhân viên — chỉ quản lý
router.put(
  "/:id",
  authenticateToken,
  checkRole("quan_ly"),
  async (req, res) => {
    const { id } = req.params;
    const { error, value } = nhanVienSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res
        .status(400)
        .json({ errors: error.details.map((e) => e.message) });
    }
    try {
      // Kiểm tra nhân viên tồn tại
      const nhanVien = await prisma.nhan_vien.findUnique({
        where: { id: parseInt(id) },
      });
      if (!nhanVien) {
        return res.status(404).json({ error: "Nhân viên không tồn tại" });
      }

      // Kiểm tra tính duy nhất
      const existingNhanVien = await prisma.nhan_vien.findFirst({
        where: {
          OR: [
            value.tai_khoan !== nhanVien.tai_khoan
              ? { tai_khoan: value.tai_khoan }
              : {},
            value.email && value.email !== nhanVien.email
              ? { email: value.email }
              : {},
          ],
          id: { not: parseInt(id) },
        },
      });
      if (existingNhanVien) {
        return res
          .status(409)
          .json({ error: "Tài khoản hoặc email đã tồn tại" });
      }

      const data = {
        tai_khoan: value.tai_khoan,
        ho_ten: value.ho_ten,
        so_dien_thoai: value.so_dien_thoai || null,
        dia_chi: value.dia_chi || null,
        email: value.email || null,
        ngay_sinh: value.ngay_sinh ? new Date(value.ngay_sinh) : null,
        ngay_vao_lam: value.ngay_vao_lam ? new Date(value.ngay_vao_lam) : null,
        trang_thai: value.trang_thai,
        vai_tro: value.vai_tro,
      };

      if (value.mat_khau && value.mat_khau.trim() !== "") {
        data.mat_khau = await bcrypt.hash(value.mat_khau, 10);
      }

      const nv = await prisma.nhan_vien.update({
        where: { id: parseInt(id) },
        data,
      });
      res.json(nv);
    } catch (error) {
      console.error("Lỗi khi cập nhật nhân viên:", error.message, error.stack);
      if (error.code === "P2002") {
        return res
          .status(409)
          .json({ error: "Tài khoản hoặc email đã tồn tại" });
      }
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Nhân viên không tồn tại" });
      }
      res.status(500).json({ error: "Lỗi server khi cập nhật nhân viên" });
    }
  }
);
// Xóa nhân viên — chỉ quản lý
router.delete(
  "/:id",
  authenticateToken,
  checkRole("quan_ly"),
  async (req, res) => {
    const { id } = req.params;
    try {
      // Kiểm tra nhân viên tồn tại trước khi xóa
      const nhanVien = await prisma.nhan_vien.findUnique({
        where: { id: parseInt(id) },
      });

      if (!nhanVien) {
        return res.status(404).json({ error: "Nhân viên không tồn tại" });
      }

      await prisma.nhan_vien.delete({ where: { id: parseInt(id) } });
      res.json({ message: "Đã xóa nhân viên thành công" });
    } catch (error) {
      console.error("Lỗi khi xóa nhân viên:", error);
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Nhân viên không tồn tại" });
      }
      res.status(500).json({ error: "Lỗi server khi xóa nhân viên" });
    }
  }
);

module.exports = router;
