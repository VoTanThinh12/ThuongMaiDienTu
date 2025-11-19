// const express = require("express");
// const router = express.Router();
// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();
// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcryptjs");

// // Đăng nhập
// router.post("/login", async (req, res) => {
//   const { tai_khoan, mat_khau } = req.body;
//   try {
//     const nhanVien = await prisma.nhan_vien.findUnique({
//       where: { tai_khoan },
//     });

//     if (!nhanVien) {
//       return res.status(401).json({ error: "Tài khoản không tồn tại" });
//     }

//     const isMatch = await bcrypt.compare(mat_khau, nhanVien.mat_khau);
//     if (!isMatch) {
//       return res.status(401).json({ error: "Mật khẩu không đúng" });
//     }

//     // Chuẩn hóa vai_tro về chữ thường
//     const vaiTroNormalized = nhanVien.vai_tro.toLowerCase();

//     // Bắt buộc JWT_SECRET phải tồn tại
//     if (!process.env.JWT_SECRET) {
//       console.error("JWT_SECRET chưa được cấu hình trong .env");
//       return res.status(500).json({ error: "Cấu hình server không hợp lệ" });
//     }

//     // Tạo token chứa đầy đủ thông tin
//     const token = jwt.sign(
//       {
//         id: nhanVien.id,
//         ho_ten: nhanVien.ho_ten,
//         email: nhanVien.email,
//         vai_tro: vaiTroNormalized,
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     res.json({
//       token,
//       nhanVien: {
//         id: nhanVien.id,
//         ho_ten: nhanVien.ho_ten,
//         email: nhanVien.email,
//         vai_tro: vaiTroNormalized,
//       },
//     });
//   } catch (error) {
//     console.error("Lỗi đăng nhập:", error);
//     res.status(500).json({ error: "Lỗi khi đăng nhập" });
//   }
// });

// // Đăng ký
// router.post("/register", async (req, res) => {
//   let { ho_ten, tai_khoan, mat_khau, vai_tro, email } = req.body;
//   try {
//     // Chuẩn hóa role
//     vai_tro = vai_tro.toLowerCase();

//     // Chỉ cho phép 2 role
//     const allowedRoles = ["quan_ly", "nhan_vien"];
//     if (!allowedRoles.includes(vai_tro)) {
//       return res
//         .status(400)
//         .json({
//           error: "Vai trò không hợp lệ. Chỉ chấp nhận: quan_ly hoặc nhan_vien",
//         });
//     }

//     // Kiểm tra tài khoản trùng
//     const existed = await prisma.nhan_vien.findUnique({ where: { tai_khoan } });
//     if (existed) {
//       return res.status(400).json({ error: "Tài khoản đã tồn tại" });
//     }

//     const hashedPassword = await bcrypt.hash(mat_khau, 10);

//     const nhanVien = await prisma.nhan_vien.create({
//       data: {
//         ho_ten,
//         tai_khoan,
//         mat_khau: hashedPassword,
//         vai_tro,
//         email,
//         trang_thai: true,
//       },
//     });

//     res.json({ message: "Đã tạo tài khoản thành công", nhanVien });
//   } catch (error) {
//     console.error("Lỗi đăng ký:", error);
//     res.status(400).json({ error: error.message });
//   }
// });

// module.exports = router;
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Đăng nhập
router.post("/login", async (req, res) => {
  const { tai_khoan, mat_khau } = req.body;
  try {
    const nhanVien = await prisma.nhan_vien.findUnique({
      where: { tai_khoan },
    });

    if (!nhanVien) {
      return res.status(401).json({ error: "Tài khoản không tồn tại" });
    }

    const isMatch = await bcrypt.compare(mat_khau, nhanVien.mat_khau);
    if (!isMatch) {
      return res.status(401).json({ error: "Mật khẩu không đúng" });
    }

    // Chuẩn hóa vai_tro về chữ thường
    const vaiTroNormalized = nhanVien.vai_tro.toLowerCase();

    // Bắt buộc JWT_SECRET phải tồn tại
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET chưa được cấu hình trong .env");
      return res.status(500).json({ error: "Cấu hình server không hợp lệ" });
    }

    // Tạo token chứa đầy đủ thông tin
    const token = jwt.sign(
      {
        id: nhanVien.id,
        ho_ten: nhanVien.ho_ten,
        email: nhanVien.email,
        vai_tro: vaiTroNormalized,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      nhanVien: {
        id: nhanVien.id,
        ho_ten: nhanVien.ho_ten,
        email: nhanVien.email,
        vai_tro: vaiTroNormalized,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({ error: "Lỗi khi đăng nhập" });
  }
});

// Đăng ký
router.post("/register", async (req, res) => {
  let { ho_ten, tai_khoan, mat_khau, vai_tro, email } = req.body;
  try {
    // Chuẩn hóa role
    vai_tro = vai_tro.toLowerCase();

    // Chỉ cho phép 2 role
    const allowedRoles = ["quan_ly", "nhan_vien"];
    if (!allowedRoles.includes(vai_tro)) {
      return res
        .status(400)
        .json({
          error: "Vai trò không hợp lệ. Chỉ chấp nhận: quan_ly hoặc nhan_vien",
        });
    }

    // Kiểm tra tài khoản trùng
    const existed = await prisma.nhan_vien.findUnique({ where: { tai_khoan } });
    if (existed) {
      return res.status(400).json({ error: "Tài khoản đã tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(mat_khau, 10);

    const nhanVien = await prisma.nhan_vien.create({
      data: {
        ho_ten,
        tai_khoan,
        mat_khau: hashedPassword,
        vai_tro,
        email,
        trang_thai: true,
      },
    });

    res.json({ message: "Đã tạo tài khoản thành công", nhanVien });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
