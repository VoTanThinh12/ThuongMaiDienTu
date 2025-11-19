const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { authenticateToken, checkRole } = require("../middleware/auth");
const Joi = require("joi");

// Schema validation cho hoàn trả
const hoanTraSchema = Joi.object({
  id_hoa_don: Joi.number().integer().required(),
  ly_do: Joi.string().allow('', null).optional(),
  chi_tiet_hoan_tra: Joi.array().items(
    Joi.object({
      id_chi_tiet_hoa_don: Joi.number().integer().required(),
      so_luong_hoan: Joi.number().integer().min(1).required(),
      ly_do_hoan: Joi.string().allow('', null).optional(),
    })
  ).min(1).required(),
});

// Tạo phiếu hoàn trả
router.post(
  "/tao",
  authenticateToken,
  checkRole(["quan_ly", "thu_ngan"]),
  async (req, res) => {
    console.log('Received return request:', req.body);
    console.log('User info:', { id: req.user.id, role: req.user.vai_tro });
    
    const { error, value } = hoanTraSchema.validate(req.body);
    
    if (error) {
      console.log('Validation error:', error.details);
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: error.details.map(e => e.message)
      });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Kiểm tra hóa đơn tồn tại
        const hoaDon = await tx.hoa_don_ban.findUnique({
          where: { id: value.id_hoa_don },
          include: {
            chi_tiet_hoa_don_ban: {
              include: { san_pham: true }
            }
          }
        });

        if (!hoaDon) {
          throw new Error("Không tìm thấy hóa đơn");
        }

        // Kiểm tra quyền truy cập (thu ngân chỉ được hoàn trả đơn của mình)
        if (req.user.vai_tro === 'thu_ngan' && hoaDon.id_nhan_vien !== req.user.id) {
          throw new Error("Không có quyền hoàn trả đơn hàng này");
        }

        // Kiểm tra số lượng hoàn trả hợp lệ
        for (const item of value.chi_tiet_hoan_tra) {
          const chiTiet = hoaDon.chi_tiet_hoa_don_ban.find(
            ct => ct.id === item.id_chi_tiet_hoa_don
          );
          
          if (!chiTiet) {
            throw new Error(`Không tìm thấy chi tiết hóa đơn với ID ${item.id_chi_tiet_hoa_don}`);
          }

          // Kiểm tra số lượng đã hoàn trả trước đó
          const daHoanTra = await tx.chi_tiet_hoan_tra.aggregate({
            where: { id_chi_tiet_hoa_don: item.id_chi_tiet_hoa_don },
            _sum: { so_luong_hoan: true }
          });

          const soLuongDaHoan = daHoanTra._sum.so_luong_hoan || 0;
          const soLuongConLai = chiTiet.so_luong - soLuongDaHoan;

          if (item.so_luong_hoan > soLuongConLai) {
            throw new Error(
              `Số lượng hoàn trả ${item.so_luong_hoan} vượt quá số lượng còn lại ${soLuongConLai} của sản phẩm ${chiTiet.san_pham.ten_san_pham}`
            );
          }
        }

        // Tính tổng tiền hoàn
        let tongTienHoan = 0;
        for (const item of value.chi_tiet_hoan_tra) {
          const chiTiet = hoaDon.chi_tiet_hoa_don_ban.find(
            ct => ct.id === item.id_chi_tiet_hoa_don
          );
          tongTienHoan += Number(chiTiet.don_gia) * item.so_luong_hoan;
        }

        // Tạo phiếu hoàn trả
        const phieuHoanTra = await tx.phieu_hoan_tra.create({
          data: {
            id_hoa_don: value.id_hoa_don,
            id_nhan_vien: req.user.id,
            tong_tien_hoan: tongTienHoan,
            ly_do: value.ly_do || "",
            trang_thai: "HOAN_THANH", // Trực tiếp hoàn thành không cần duyệt
            chi_tiet_hoan_tra: {
              create: value.chi_tiet_hoan_tra.map(item => {
                const chiTiet = hoaDon.chi_tiet_hoa_don_ban.find(
                  ct => ct.id === item.id_chi_tiet_hoa_don
                );
                return {
                  id_chi_tiet_hoa_don: item.id_chi_tiet_hoa_don,
                  so_luong_hoan: item.so_luong_hoan,
                  don_gia_hoan: chiTiet.don_gia,
                  ly_do_hoan: item.ly_do_hoan || ""
                };
              })
            }
          },
          include: {
            chi_tiet_hoan_tra: {
              include: {
                chi_tiet_hoa_don_ban: {
                  include: { san_pham: true }
                }
              }
            }
          }
        });

        // Cập nhật số lượng sản phẩm trong kho ngay lập tức
        for (const item of value.chi_tiet_hoan_tra) {
          const chiTiet = hoaDon.chi_tiet_hoa_don_ban.find(
            ct => ct.id === item.id_chi_tiet_hoa_don
          );
          
          if (chiTiet) {
            await tx.san_pham.update({
              where: { id: chiTiet.san_pham.id },
              data: {
                so_luong: {
                  increment: item.so_luong_hoan
                }
              }
            });
          }
        }

        return phieuHoanTra;
      });

      res.json({
        message: "Hoàn trả thành công và đã cập nhật kho hàng",
        phieu_hoan_tra: result
      });

    } catch (error) {
      console.error("Lỗi khi tạo phiếu hoàn trả:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Duyệt phiếu hoàn trả (chỉ quản lý)
router.put(
  "/:id/duyet",
  authenticateToken,
  checkRole(["quan_ly"]),
  async (req, res) => {
    const { trang_thai } = req.body; // DA_DUYET hoặc TU_CHOI

    if (!["DA_DUYET", "TU_CHOI"].includes(trang_thai)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const phieuHoanTra = await tx.phieu_hoan_tra.findUnique({
          where: { id: Number(req.params.id) },
          include: {
            chi_tiet_hoan_tra: {
              include: {
                chi_tiet_hoa_don_ban: {
                  include: { san_pham: true }
                }
              }
            }
          }
        });

        if (!phieuHoanTra) {
          throw new Error("Không tìm thấy phiếu hoàn trả");
        }

        if (phieuHoanTra.trang_thai !== "CHO_DUYET") {
          throw new Error("Phiếu hoàn trả đã được xử lý");
        }

        // Cập nhật trạng thái phiếu
        const updated = await tx.phieu_hoan_tra.update({
          where: { id: Number(req.params.id) },
          data: { trang_thai }
        });

        // Nếu duyệt thì cập nhật lại kho
        if (trang_thai === "DA_DUYET") {
          for (const chiTiet of phieuHoanTra.chi_tiet_hoan_tra) {
            await tx.san_pham.update({
              where: { id: chiTiet.chi_tiet_hoa_don_ban.id_san_pham },
              data: {
                so_luong: {
                  increment: chiTiet.so_luong_hoan
                }
              }
            });
          }

          // Đánh dấu hoàn thành
          await tx.phieu_hoan_tra.update({
            where: { id: Number(req.params.id) },
            data: { trang_thai: "HOAN_THANH" }
          });
        }

        return updated;
      });

      res.json({
        message: trang_thai === "DA_DUYET" ? "Đã duyệt và hoàn hàng vào kho" : "Đã từ chối phiếu hoàn trả",
        phieu_hoan_tra: result
      });

    } catch (error) {
      console.error("Lỗi khi duyệt phiếu hoàn trả:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Lấy danh sách phiếu hoàn trả theo hóa đơn
router.get(
  "/hoadon/:id",
  authenticateToken,
  checkRole(["quan_ly", "thu_ngan"]),
  async (req, res) => {
    try {
      const phieuHoanTra = await prisma.phieu_hoan_tra.findMany({
        where: { id_hoa_don: Number(req.params.id) },
        include: {
          nhan_vien: { select: { ho_ten: true } },
          chi_tiet_hoan_tra: {
            include: {
              chi_tiet_hoa_don_ban: {
                include: { san_pham: true }
              }
            }
          }
        },
        orderBy: { ngay_hoan_tra: 'desc' }
      });

      res.json(phieuHoanTra);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách hoàn trả:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Lấy tất cả phiếu hoàn trả (quản lý)
router.get(
  "/",
  authenticateToken,
  checkRole(["quan_ly"]),
  async (req, res) => {
    try {
      const phieuHoanTra = await prisma.phieu_hoan_tra.findMany({
        include: {
          hoa_don_ban: { select: { id: true, ngay_ban: true } },
          nhan_vien: { select: { ho_ten: true } },
          chi_tiet_hoan_tra: {
            include: {
              chi_tiet_hoa_don_ban: {
                include: { san_pham: true }
              }
            }
          }
        },
        orderBy: { ngay_hoan_tra: 'desc' }
      });

      res.json(phieuHoanTra);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách hoàn trả:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
