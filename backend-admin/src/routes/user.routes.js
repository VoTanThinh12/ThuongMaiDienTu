const express = require("express");
const router = express.Router();
const { authenticateToken, checkRole } = require("../middleware/auth");

// Chỉ quản lý mới được xem
router.get("/", authenticateToken, checkRole("quan_ly"), (req, res) => {
  try {
    res.json({ message: "User route is working!" });
  } catch (error) {
    console.error("Lỗi trong user route:", error);
    res.status(500).json({ error: "Lỗi server trong user route" });
  }
});

module.exports = router;
