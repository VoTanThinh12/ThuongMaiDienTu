const express = require("express");
const app = express();
const cors = require("cors");

const nhanvienRoutes = require("./routes/nhanvien.routes.js");
const sanPhamRoutes = require("./routes/sanpham.routes.js");
const phieuNhapRoutes = require("./routes/phieunhap.routes.js");
const authRoutes = require("./routes/auth.routes.js");
const baocaoRoutes = require("./routes/baocao.routes.js");
const hoadonbanRoutes = require("./routes/hoadonban.routes.js");
const userRoutes = require("./routes/user.routes.js");
const dashboardRoutes = require("./routes/dashboard.routes.js");
const posRoutes = require("./routes/pos.routes.js");
const hoantraRoutes = require("./routes/hoantra.routes.js");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Chào mừng đến với API quản lý cửa hàng tiện lợi!",
    endpoints: [
      { path: "/api/nhanvien", methods: ["GET", "POST", "PUT", "DELETE"] },
      { path: "/api/sanpham", methods: ["GET", "POST", "PUT", "DELETE"] },
      { path: "/api/phieunhap/tao", methods: ["POST"] },
      { path: "/api/auth/login", methods: ["POST"] },
      { path: "/api/auth/register", methods: ["POST"] },
      { path: "/api/dashboard/summary", methods: ["GET"] }, // ✅ hiển thị API mới
    ],
  });
});

app.use("/api/nhanvien", nhanvienRoutes);
app.use("/api/sanpham", sanPhamRoutes);
app.use("/api/phieunhap", phieuNhapRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/baocao", baocaoRoutes);
app.use("/api/hoadonban", hoadonbanRoutes);
app.use("/api/user", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/hoantra", hoantraRoutes);

app.listen(3001, () => {
  console.log("Server chạy tại http://localhost:3001");
});
