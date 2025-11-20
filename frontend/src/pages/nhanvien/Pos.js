import React, { useEffect, useMemo, useState } from "react";
import {
  Input,
  Table,
  Button,
  Card,
  InputNumber,
  message,
  Space,
  Modal,
  Typography,
  Badge,
  Divider,
  Radio,
  Steps,
  Tooltip,
  QRCode,
} from "antd";
import {
  LogoutOutlined,
  UserOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  QrcodeOutlined,
  ScheduleOutlined,
  BankOutlined,
} from "@ant-design/icons";

import api from "../../utils/api";
import { useNavigate } from "react-router-dom";

// helper from antd Typography
const { Text } = Typography;

const Pos = () => {
  const navigate = useNavigate();
  const [tuKhoa, setTuKhoa] = useState("");
  const [danhSachSanPham, setDanhSachSanPham] = useState([]);
  const [gioHang, setGioHang] = useState([]);
  const [tienMat, setTienMat] = useState(0);
  const [modalThanhCong, setModalThanhCong] = useState({
    open: false,
    hoaDon: null,
    tienMat: 0,
    tienThoi: 0,
  });
  const [modalThanhToan, setModalThanhToan] = useState({
    open: false,
    phuongThuc: "cash",
  });
  const [keHoachTraGop, setKeHoachTraGop] = useState({
    soThang: 6,
    tienHangThang: 0,
  });
  const [loiThanhToan, setLoiThanhToan] = useState("");

  const hoTen = localStorage.getItem("ho_ten") || "Nhân viên";

  const cacBuocCong = [10000, 20000, 50000, 100000];
  const cacBuocTru = [-10000, -20000, -50000];

  const chuanHoa = (s = "") =>
    String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9 ]/g, "");

  // Hàm lấy danh sách sản phẩm
  const layDanhSachSanPham = async () => {
    try {
      const res = await api.get("/sanpham");
      setDanhSachSanPham(res.data || []);
    } catch (e) {
      message.error("Không tải được danh sách sản phẩm");
    }
  };

  useEffect(() => {
    layDanhSachSanPham();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lọc theo từ khóa (có hỗ trợ không dấu)
  const danhSachDaLoc = useMemo(() => {
    const khoa = chuanHoa(tuKhoa.trim());
    if (!khoa) return danhSachSanPham;
    return danhSachSanPham.filter(
      (sp) =>
        chuanHoa(sp.ten_san_pham).includes(khoa) ||
        chuanHoa(sp.ma_san_pham).includes(khoa)
    );
  }, [tuKhoa, danhSachSanPham]);

  const themVaoGio = (sanPham) => {
    // Kiểm tra số lượng còn lại trong kho
    if (sanPham.so_luong <= 0) {
      message.error(`Sản phẩm "${sanPham.ten_san_pham}" đã hết hàng!`);
      return;
    }

    // Kiểm tra số lượng đã có trong giỏ
    const daTonTai = gioHang.find((x) => x.id === sanPham.id);
    const soLuongTrongGio = daTonTai ? daTonTai.so_luong : 0;

    if (soLuongTrongGio >= sanPham.so_luong) {
      message.error(
        `Không thể thêm. Chỉ còn ${sanPham.so_luong} sản phẩm trong kho!`
      );
      return;
    }

    // Cập nhật giỏ hàng
    setGioHang((truoc) => {
      const daTonTai = truoc.find((x) => x.id === sanPham.id);
      if (daTonTai)
        return truoc.map((x) =>
          x.id === sanPham.id ? { ...x, so_luong: x.so_luong + 1 } : x
        );
      return [
        ...truoc,
        {
          id: sanPham.id,
          ten: sanPham.ten_san_pham,
          don_gia: Number(sanPham.gia_ban),
          so_luong: 1,
          so_luong_kho: sanPham.so_luong, // Lưu số lượng kho để kiểm tra
        },
      ];
    });

    // Tự động trừ số lượng trong danh sách sản phẩm
    setDanhSachSanPham((prevList) =>
      prevList.map((sp) =>
        sp.id === sanPham.id ? { ...sp, so_luong: sp.so_luong - 1 } : sp
      )
    );

    // Hiển thị cảnh báo nếu sản phẩm sắp hết (sau khi trừ)
    const soLuongConLai = sanPham.so_luong - 1;
    if (soLuongConLai <= 10 && soLuongConLai > 0) {
      message.warning(
        `⚠️ Sản phẩm "${sanPham.ten_san_pham}" chỉ còn ${soLuongConLai} trong kho!`
      );
    }
  };
  const capNhatSoLuong = (id, soLuongMoi) => {
    // Tìm sản phẩm trong danh sách để kiểm tra số lượng kho
    const sanPham = danhSachSanPham.find((sp) => sp.id === id);
    const itemTrongGio = gioHang.find((item) => item.id === id);

    if (!sanPham || !itemTrongGio) return;

    const soLuongCu = itemTrongGio.so_luong;
    const soLuongKhoHienTai = sanPham.so_luong;
    const soLuongKhoGoc = soLuongKhoHienTai + soLuongCu; // Số lượng kho ban đầu

    if (soLuongMoi > soLuongKhoGoc) {
      message.error(
        `Không thể đặt ${soLuongMoi}. Chỉ có ${soLuongKhoGoc} sản phẩm trong kho!`
      );
      return;
    }

    // Cập nhật giỏ hàng
    setGioHang((truoc) =>
      truoc.map((x) => (x.id === id ? { ...x, so_luong: soLuongMoi || 1 } : x))
    );

    // Cập nhật số lượng trong danh sách sản phẩm
    const chenhLech = soLuongMoi - soLuongCu;
    setDanhSachSanPham((prevList) =>
      prevList.map((sp) =>
        sp.id === id ? { ...sp, so_luong: sp.so_luong - chenhLech } : sp
      )
    );

    // Cảnh báo nếu sản phẩm sắp hết
    const soLuongConLai = soLuongKhoHienTai - chenhLech;
    if (soLuongConLai <= 10 && soLuongConLai > 0) {
      message.warning(
        `⚠️ Sản phẩm "${sanPham.ten_san_pham}" chỉ còn ${soLuongConLai} trong kho!`
      );
    }
  };
  const xoaKhoiGio = (id) => {
    const itemCanXoa = gioHang.find((item) => item.id === id);
    if (!itemCanXoa) return;

    // Hoàn lại số lượng cho kho
    setDanhSachSanPham((prevList) =>
      prevList.map((sp) =>
        sp.id === id
          ? { ...sp, so_luong: sp.so_luong + itemCanXoa.so_luong }
          : sp
      )
    );

    setGioHang((truoc) => truoc.filter((x) => x.id !== id));
    message.success("Đã xóa sản phẩm khỏi giỏ hàng và hoàn lại kho");
  };
  const tongTien = useMemo(
    () => gioHang.reduce((tong, x) => tong + x.don_gia * x.so_luong, 0),
    [gioHang]
  );
  const tienThoi = useMemo(
    () => Math.max(0, Number(tienMat) - tongTien),
    [tienMat, tongTien]
  );
  const themTien = (soTien) => {
    const tienMoi = Math.max(0, Number(tienMat || 0) + soTien);
    setTienMat(tienMoi);

    // Xóa lỗi nếu đã đủ tiền
    if (tienMoi >= tongTien) {
      setLoiThanhToan("");
    }
  };

  // Tính toán trả góp
  const tinhTraGop = (soThang) => {
    const tienHangThang = Math.ceil(tongTien / soThang);
    setKeHoachTraGop({ soThang, tienHangThang });
  };

  // const xuLyThanhToan = async () => {
  //   if (!gioHang.length) return message.warning("Chưa có hàng trong giỏ");

  //   // Mở modal chọn phương thức thanh toán
  //   setModalThanhToan({ open: true, phuongThuc: "cash" });
  // };
  // Thay thế hàm xuLyThanhToan hiện tại
  const xuLyThanhToan = async () => {
    if (!gioHang.length) return message.warning("Chưa có hàng trong giỏ");

    // Mở modal trước
    setModalThanhToan({ open: true, phuongThuc: "cash" });

    // Kiểm tra ngay lập tức nếu thanh toán tiền mặt và không đủ tiền
    if (Number(tienMat) < tongTien) {
      const thieuTien = tongTien - Number(tienMat);
      setLoiThanhToan(
        `Tiền khách đưa không đủ! Cần thêm ${new Intl.NumberFormat(
          "vi-VN"
        ).format(thieuTien)}₫`
      );
    } else {
      // Reset lỗi nếu đủ tiền
      setLoiThanhToan("");
    }
  };

  // Thay thế hàm thucHienThanhToan hiện tại
  const thucHienThanhToan = async () => {
    // Kiểm tra nếu thanh toán tiền mặt và tiền khách đưa không đủ
    if (modalThanhToan.phuongThuc === "cash" && Number(tienMat) < tongTien) {
      const thieuTien = tongTien - Number(tienMat);
      setLoiThanhToan(
        `Tiền khách đưa không đủ! Cần thêm ${new Intl.NumberFormat(
          "vi-VN"
        ).format(thieuTien)}₫`
      );
      return;
    }

    // Xóa lỗi nếu validation passed
    setLoiThanhToan("");

    try {
      const nvId = localStorage.getItem("nvId");
      const duLieuThanhToan = {
        id_nhan_vien: Number(nvId) || 0,
        tien_khach_dua:
          modalThanhToan.phuongThuc === "cash" ? Number(tienMat) : tongTien,

        danhSachSanPham: gioHang.map((x) => ({
          id_san_pham: x.id,
          so_luong: x.so_luong,
          don_gia: x.don_gia,
        })),
      };

      const res = await api.post("/hoadonban/tao", duLieuThanhToan);
      const hoaDon = res.data;

      // Đóng modal thanh toán
      setModalThanhToan({ open: false, phuongThuc: "cash" });

      // Hiện hóa đơn thành công
      setModalThanhCong({
        open: true,
        hoaDon: {
          ...hoaDon,
          phuong_thuc_thanh_toan: modalThanhToan.phuongThuc,
        },
        tienMat:
          modalThanhToan.phuongThuc === "cash" ? Number(tienMat) : tongTien,
        tienThoi: modalThanhToan.phuongThuc === "cash" ? Number(tienThoi) : 0,
      });

      // Reset giỏ
      setGioHang([]);
      setTienMat(0);
      setLoiThanhToan("");

      // Tải lại danh sách sản phẩm để cập nhật số lượng mới từ server
      layDanhSachSanPham();
    } catch (e) {
      message.error(e.response?.data?.error || "Tạo hoá đơn thất bại");
    }
  };

  const dangXuat = () => {
    localStorage.clear();
    navigate("/login");
  };
  const handleTienMatChange = (e) => {
    const value = Number(e.target.value.replace(/[^0-9]/g, "") || 0);
    setTienMat(value);

    // Kiểm tra và cập nhật lỗi ngay lập tức
    if (modalThanhToan.phuongThuc === "cash") {
      if (value < tongTien) {
        const thieuTien = tongTien - value;
        setLoiThanhToan(
          `Tiền khách đưa không đủ! Cần thêm ${new Intl.NumberFormat(
            "vi-VN"
          ).format(thieuTien)}₫`
        );
      } else {
        setLoiThanhToan("");
      }
    }
  };
  return (
    <div
    // style={{
    //   minHeight: "100vh",
    //   backgroundColor: "#f0f2f5",
    //   padding: "20px",
    // }}
    >
      <div
      // style={{
      //   backgroundColor: "white",
      //   borderRadius: "8px",
      //   padding: "24px",
      //   boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      //   overflow: "hidden",
      // }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 450px",
            gap: 16,
            boxSizing: "border-box",
          }}
        >
          {/* CỘT TRÁI: Sản phẩm */}
          <Card
            style={{
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "1px solid #d9d9d9",
            }}
            bodyStyle={{ padding: "24px" }}
            title={
              <div
                style={{
                  margin: "0 0 16px 0",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  color: "white",
                  boxSizing: "border-box",
                  width: "100%",
                }}
              >
                <Space align="center" style={{ width: "100%" }}>
                  <SearchOutlined
                    style={{ fontSize: "20px", flex: "0 0 28px" }}
                  />
                  <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                    <Input
                      value={tuKhoa}
                      onChange={(e) => setTuKhoa(e.target.value)}
                      placeholder="🔍 Tìm sản phẩm theo tên hoặc mã..."
                      allowClear
                      size="large"
                      style={{
                        width: "100%",
                        borderRadius: "6px",
                        backgroundColor: "white",
                        minWidth: 0,
                      }}
                    />
                  </div>
                  <Badge
                    count={danhSachDaLoc.length}
                    style={{ backgroundColor: "#52c41a" }}
                    showZero
                  >
                    <Text style={{ color: "#52c41a", marginLeft: 8 }}>
                      Sản phẩm
                    </Text>
                  </Badge>
                </Space>
              </div>
            }
          >
            <Table
              tableLayout="fixed"
              rowKey="id"
              size="small"
              dataSource={danhSachDaLoc}
              columns={[
                {
                  title: "Mã SP",
                  dataIndex: "ma_san_pham",
                  width: 100,
                  render: (text) => (
                    <Text
                      code
                      style={{
                        backgroundColor: "#f0f0f0",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {text}
                    </Text>
                  ),
                },
                {
                  title: "Tên sản phẩm",
                  dataIndex: "ten_san_pham",
                  ellipsis: true,
                  render: (text) => (
                    <Text strong style={{ color: "#1890ff" }}>
                      {text}
                    </Text>
                  ),
                },
                {
                  title: "Số lượng",
                  dataIndex: "so_luong",
                  width: 70, // Thêm độ rộng cố định cho cột
                  align: "center",

                  ellipsis: true,
                  render: (text) => (
                    <Text
                      strong
                      style={{
                        color: text <= 10 ? "#ff4d4f" : "#1890ff",
                        backgroundColor: text <= 10 ? "#fff2f0" : "transparent",
                        padding: text <= 10 ? "2px 6px" : "0",
                        borderRadius: text <= 10 ? "4px" : "0",
                        border: text <= 10 ? "1px solid #ffccc7" : "none",
                      }}
                    >
                      {text <= 10 ? `⚠️ ${text}` : text}
                    </Text>
                  ),
                },
                {
                  title: "Giá bán",
                  dataIndex: "gia_ban",
                  render: (v) => (
                    <Text
                      style={{
                        color: "#f5222d",
                        fontWeight: "600",
                        fontSize: "14px",
                      }}
                    >
                      {Number(v).toLocaleString()}₫
                    </Text>
                  ),
                  align: "right",
                  width: 120,
                },
                {
                  title: "",
                  render: (_, sp) => {
                    const soLuongTrongGio =
                      gioHang.find((x) => x.id === sp.id)?.so_luong || 0;
                    const coTheThemNua = soLuongTrongGio < sp.so_luong;
                    const hetHang = sp.so_luong <= 0;
                    const sapHet = sp.so_luong <= 10 && sp.so_luong > 0;

                    return (
                      <Button
                        type="primary"
                        icon={hetHang ? <DeleteOutlined /> : <PlusOutlined />}
                        onClick={() => themVaoGio(sp)}
                        disabled={hetHang || !coTheThemNua}
                        style={{
                          borderRadius: "8px",
                          background: hetHang
                            ? "#ff4d4f"
                            : sapHet
                            ? "linear-gradient(45deg, #ff9c6e 0%, #ff6b6b 100%)"
                            : "linear-gradient(45deg, #36d1dc 0%, #5b86e5 100%)",
                          border: "none",
                          fontWeight: "500",
                          opacity: !coTheThemNua || hetHang ? 0.6 : 1,
                        }}
                      >
                        {hetHang
                          ? "Hết hàng"
                          : sapHet
                          ? `⚠️ Thêm (${sp.so_luong})`
                          : "Thêm"}
                      </Button>
                    );
                  },
                  width: 160,
                },
              ]}
              pagination={true}
              // scroll={{ y: 420, x: "max-content" }}
              style={{
                backgroundColor: "#fafafa",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            />

            {/* <div style={{ marginTop: 20, textAlign: "right" }}>
              <Button
                type="default"
                icon={<FileTextOutlined />}
                onClick={() => navigate("/pos/orders")}
                size="large"
                style={{
                  borderRadius: "10px",
                  height: "48px",
                  fontWeight: "500",
                  background:
                    "linear-gradient(45deg, #ffecd2 0%, #fcb69f 100%)",
                  border: "none",
                  color: "#8b4513",
                }}
              >
                📋 Đơn hôm nay
              </Button>
            </div> */}
          </Card>

          {/* CỘT PHẢI: Giỏ hàng */}
          <Card
            style={{
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "1px solid #d9d9d9",
              width: "450px",
            }}
            title={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      background: "#f6ffed",
                      color: "#389e0d",
                      padding: "6px 10px",
                      borderRadius: 20,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <UserOutlined />
                    <span style={{ fontWeight: 600 }}>{hoTen}</span>
                  </div>
                  <Badge
                    count={gioHang.length}
                    style={{ backgroundColor: "#f5222d" }}
                    showZero
                  >
                    <ShoppingCartOutlined style={{ fontSize: 18 }} />
                  </Badge>
                </div>

                <Button
                  icon={<LogoutOutlined />}
                  onClick={dangXuat}
                  style={{ borderRadius: 6, border: "1px solid #d9d9d9" }}
                >
                  Đăng xuất
                </Button>
              </div>
            }
          >
            <Table
              tableLayout="fixed"
              rowKey="id"
              size="small"
              dataSource={gioHang}
              columns={[
                {
                  title: "Sản phẩm",
                  dataIndex: "ten",
                  ellipsis: true,
                  render: (text) => (
                    <Text strong style={{ color: "#722ed1" }}>
                      {text}
                    </Text>
                  ),
                },
                {
                  title: "SL",
                  render: (_, x) => (
                    <InputNumber
                      min={1}
                      value={x.so_luong}
                      onChange={(v) => capNhatSoLuong(x.id, v)}
                      style={{
                        borderRadius: "6px",
                        width: "100%",
                      }}
                    />
                  ),
                  width: 70,
                  align: "center",
                },
                {
                  title: "Thành tiền",
                  render: (_, x) => (
                    <Text
                      style={{
                        color: "#52c41a",
                        fontWeight: "600",
                      }}
                    >
                      {(x.so_luong * x.don_gia).toLocaleString()}₫
                    </Text>
                  ),
                  width: 110,
                  align: "right",
                },
                {
                  title: "",
                  render: (_, x) => (
                    <Tooltip title="Xóa sản phẩm">
                      <Button
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => xoaKhoiGio(x.id)}
                      />
                    </Tooltip>
                  ),
                  width: 50,
                  align: "center",
                },
              ]}
              pagination={false}
              scroll={{ y: 180 }}
              style={{
                backgroundColor: "#fafafa",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            />

            <Divider style={{ margin: "20px 0" }} />

            <div
              style={{
                background: "#f5f5f5",
                padding: "20px",
                borderRadius: "8px",
                border: "1px solid #d9d9d9",
              }}
            >
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  marginBottom: "16px",
                  textAlign: "center",
                  color: "#1890ff",
                }}
              >
                <DollarOutlined style={{ marginRight: "8px" }} />
                Tổng: {tongTien.toLocaleString()}₫
              </div>

              <Space
                direction="vertical"
                style={{ width: "100%" }}
                size="middle"
              >
                <div>
                  <Text
                    style={{
                      color: "#666",
                      fontSize: "16px",
                      fontWeight: "500",
                    }}
                  >
                    💰 Tiền khách đưa:
                  </Text>
                  <InputNumber
                    value={tienMat}
                    onChange={setTienMat}
                    min={0}
                    step={10000}
                    size="large"
                    style={{
                      width: "100%",
                      marginTop: "8px",
                      borderRadius: "8px",
                    }}
                    formatter={(value) =>
                      `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                  />
                  {/* THÊM ĐOẠN NÀY NGAY DƯỚI INPUT TRÊN */}
                  {/* {loiThanhToan && modalThanhToan.phuongThuc === "cash" && (
                    <div
                      style={{
                        color: "red",
                        backgroundColor: "#fff2f0",
                        border: "1px solid #ffccc7",
                        padding: "8px 12px",
                        borderRadius: "4px",
                        marginBottom: "10px",
                        fontSize: "14px",
                      }}
                    >
                      ⚠️ {loiThanhToan}
                    </div>
                  )} */}

                  {/* Phần hiển thị tiền thối sẽ ở dưới */}
                  {/* <Text>
                    Tiền thối: {new Intl.NumberFormat("vi-VN").format(tienThoi)}
                    ₫
                  </Text> */}
                </div>

                {/* Nút tiền nhanh: trừ */}
                <div>
                  <Text
                    style={{
                      color: "#666",
                      fontSize: "14px",
                      marginBottom: "8px",
                      display: "block",
                    }}
                  >
                    Trừ nhanh:
                  </Text>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {cacBuocTru.map((m) => (
                      <Button
                        key={m}
                        onClick={() => themTien(m)}
                        icon={<MinusOutlined />}
                        style={{
                          borderRadius: "6px",
                          backgroundColor: "#ff4d4f",
                          border: "none",
                          color: "white",
                          fontSize: "12px",
                        }}
                      >
                        {Math.abs(m).toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Nút tiền nhanh: cộng */}
                <div>
                  <Text
                    style={{
                      color: "#666",
                      fontSize: "14px",
                      marginBottom: "8px",
                      display: "block",
                    }}
                  >
                    Cộng nhanh:
                  </Text>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {cacBuocCong.map((m) => (
                      <Button
                        key={m}
                        onClick={() => themTien(m)}
                        icon={<PlusOutlined />}
                        style={{
                          borderRadius: "6px",
                          backgroundColor: "#52c41a",
                          border: "none",
                          color: "white",
                          fontSize: "12px",
                        }}
                      >
                        {m.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    textAlign: "center",
                    padding: "12px",
                    backgroundColor: "#f0f0f0",
                    borderRadius: "6px",
                    border: "1px solid #d9d9d9",
                    color: "#666",
                  }}
                >
                  💸 Tiền thối: {tienThoi.toLocaleString()}₫
                </div>

                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  onClick={xuLyThanhToan}
                  style={{
                    width: "100%",
                    height: "48px",
                    fontSize: "16px",
                    fontWeight: "600",
                    borderRadius: "6px",
                    backgroundColor: "#1890ff",
                    border: "none",
                  }}
                >
                  🎯 THANH TOÁN
                </Button>
              </Space>
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL CHỌN PHƯƠNG THỨC THANH TOÁN */}
      <Modal
        title={
          <div
            style={{
              background: "linear-gradient(45deg, #1890ff 0%, #36cfc9 100%)",
              margin: "-24px -24px 24px -24px",
              padding: "20px 24px",
              color: "white",
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            <DollarOutlined style={{ marginRight: "12px", fontSize: "24px" }} />
            💳 Chọn phương thức thanh toán
          </div>
        }
        open={modalThanhToan.open}
        onCancel={() => {
          setModalThanhToan({ open: false, phuongThuc: "cash" });
          setLoiThanhToan(""); // THÊM DÒNG NÀY
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() =>
              setModalThanhToan({ open: false, phuongThuc: "cash" })
            }
            style={{ borderRadius: "6px" }}
          >
            Hủy
          </Button>,
          // Chỉ hiển thị nút khi đủ tiền HOẶC không phải thanh toán tiền mặt
          (modalThanhToan.phuongThuc !== "cash" ||
            Number(tienMat) >= tongTien) && (
            <Button
              key="confirm"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={thucHienThanhToan}
              // disabled={
              //   modalThanhToan.phuongThuc === "cash" && Number(tienMat) < tongTien
              // }
              style={{
                borderRadius: "6px",
                background: "linear-gradient(45deg, #52c41a 0%, #73d13d 100%)",
                border: "none",
                fontWeight: "500",
              }}
            >
              Xác nhận thanh toán
            </Button>
          ),
        ].filter(Boolean)}
        width={700}
        style={{ top: 50 }}
        bodyStyle={{ padding: "24px" }}
      >
        <div
          style={{
            background: "#f5f5f5",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: "600",
              textAlign: "center",
              color: "#1890ff",
              marginBottom: "8px",
            }}
          >
            💰 Tổng tiền thanh toán: {tongTien.toLocaleString()}₫
          </div>
        </div>

        <Radio.Group
          value={modalThanhToan.phuongThuc}
          onChange={(e) => {
            setModalThanhToan({
              ...modalThanhToan,
              phuongThuc: e.target.value,
            });
            if (e.target.value === "installment") {
              tinhTraGop(6); // Mặc định 6 tháng
            }
          }}
          style={{ width: "100%" }}
        >
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {/* Thanh toán tiền mặt */}
            <Card
              hoverable
              style={{
                border:
                  modalThanhToan.phuongThuc === "cash"
                    ? "2px solid #1890ff"
                    : "1px solid #d9d9d9",
                borderRadius: "8px",
              }}
            >
              <Radio
                value="cash"
                style={{ fontSize: "16px", fontWeight: "500" }}
              >
                <Space align="center">
                  <DollarOutlined
                    style={{ fontSize: "20px", color: "#52c41a" }}
                  />
                  💵 Thanh toán tiền mặt
                </Space>
              </Radio>
              {modalThanhToan.phuongThuc === "cash" && (
                <div style={{ marginTop: "16px", marginLeft: "24px" }}>
                  <div style={{ marginBottom: "12px" }}>
                    <span style={{ color: "#666", fontWeight: "500" }}>
                      Tiền khách đưa:
                    </span>
                    <InputNumber
                      value={tienMat}
                      readOnly={true}
                      onChange={(e) => {
                        const value = Number(
                          e.target.value.replace(/[^0-9]/g, "") || 0
                        );
                        setTienMat(value);
                        // Tự động xóa lỗi khi đủ tiền
                        if (value >= tongTien) {
                          setLoiThanhToan("");
                        }
                      }}
                      min={0}
                      step={10000}
                      size="large"
                      style={{
                        width: "100%",
                        marginTop: "8px",
                        borderRadius: "6px",
                      }}
                      formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                      parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                    />
                    {loiThanhToan && (
                      <div
                        style={{
                          color: "#ff4d4f",
                          backgroundColor: "#fff2f0",
                          border: "1px solid #ffccc7",
                          padding: "8px 12px",
                          borderRadius: "4px",
                          marginTop: "8px",
                          fontSize: "14px",
                        }}
                      >
                        ⚠️ {loiThanhToan}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      padding: 8,
                      backgroundColor: tienThoi > 0 ? "#f6ffed" : "#fff1f0",
                      border: `1px solid ${
                        tienThoi > 0 ? "#b7eb8f" : "#ffccc7"
                      }`,
                      borderRadius: 4,
                      marginTop: 8,
                    }}
                  >
                    <Text
                      style={{ color: tienThoi > 0 ? "#52c41a" : "#ff4d4f" }}
                    >
                      💸 Tiền thối:
                      {new Intl.NumberFormat("vi-VN").format(tienThoi)}₫
                    </Text>
                  </div>
                </div>
              )}
            </Card>

            {/* Thanh toán thẻ */}
            <Card
              hoverable
              style={{
                border:
                  modalThanhToan.phuongThuc === "card"
                    ? "2px solid #1890ff"
                    : "1px solid #d9d9d9",
                borderRadius: "8px",
              }}
            >
              <Radio
                value="card"
                style={{ fontSize: "16px", fontWeight: "500" }}
              >
                <Space align="center">
                  <CreditCardOutlined
                    style={{ fontSize: "20px", color: "#722ed1" }}
                  />
                  💳 Thanh toán thẻ (Visa/MasterCard)
                </Space>
              </Radio>
              {modalThanhToan.phuongThuc === "card" && (
                <div style={{ marginTop: "16px", marginLeft: "24px" }}>
                  <div
                    style={{
                      textAlign: "center",
                      padding: "16px",
                      backgroundColor: "#f0f0f0",
                      borderRadius: "6px",
                      border: "2px dashed #722ed1",
                    }}
                  >
                    <CreditCardOutlined
                      style={{
                        fontSize: "48px",
                        color: "#722ed1",
                        marginBottom: "8px",
                      }}
                    />
                    <div style={{ color: "#722ed1", fontWeight: "500" }}>
                      Vui lòng quẹt thẻ hoặc chạm thẻ
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        marginTop: "4px",
                      }}
                    >
                      Hỗ trợ Visa, MasterCard, JCB
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Chuyển khoản/QR */}
            <Card
              hoverable
              style={{
                border:
                  modalThanhToan.phuongThuc === "transfer"
                    ? "2px solid #1890ff"
                    : "1px solid #d9d9d9",
                borderRadius: "8px",
              }}
            >
              <Radio
                value="transfer"
                style={{ fontSize: "16px", fontWeight: "500" }}
              >
                <Space align="center">
                  <QrcodeOutlined
                    style={{ fontSize: "20px", color: "#fa8c16" }}
                  />
                  📱 Chuyển khoản/QR Code
                </Space>
              </Radio>
              {modalThanhToan.phuongThuc === "transfer" && (
                <div style={{ marginTop: "16px", marginLeft: "24px" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "20px",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: "12px" }}>
                        <BankOutlined
                          style={{ color: "#fa8c16", marginRight: "8px" }}
                        />
                        <strong>Thông tin chuyển khoản:</strong>
                      </div>
                      <div
                        style={{
                          backgroundColor: "#fff7e6",
                          padding: "12px",
                          borderRadius: "6px",
                          border: "1px solid #ffd591",
                        }}
                      >
                        <div>
                          <strong>Ngân hàng:</strong> Vietcombank
                        </div>
                        <div>
                          <strong>STK:</strong> 1234567890
                        </div>
                        <div>
                          <strong>Chủ TK:</strong> CUAHANG ABC
                        </div>
                        <div>
                          <strong>Số tiền:</strong> {tongTien.toLocaleString()}₫
                        </div>
                        <div>
                          <strong>Nội dung:</strong> Thanh toan HD #{Date.now()}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ marginBottom: "8px", fontWeight: "500" }}>
                        Quét mã QR:
                      </div>
                      <QRCode
                        value={`Chuyen khoan ${tongTien}VND cho CUAHANG ABC`}
                        size={120}
                        style={{
                          border: "4px solid #fa8c16",
                          borderRadius: "8px",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Thanh toán trả góp */}
            <Card
              hoverable
              style={{
                border:
                  modalThanhToan.phuongThuc === "installment"
                    ? "2px solid #1890ff"
                    : "1px solid #d9d9d9",
                borderRadius: "8px",
              }}
            >
              <Radio
                value="installment"
                style={{ fontSize: "16px", fontWeight: "500" }}
              >
                <Space align="center">
                  <ScheduleOutlined
                    style={{ fontSize: "20px", color: "#13c2c2" }}
                  />
                  📅 Thanh toán trả góp
                </Space>
              </Radio>
              {modalThanhToan.phuongThuc === "installment" && (
                <div style={{ marginTop: "16px", marginLeft: "24px" }}>
                  <div style={{ marginBottom: "16px" }}>
                    <span
                      style={{
                        color: "#666",
                        fontWeight: "500",
                        marginBottom: "8px",
                        display: "block",
                      }}
                    >
                      Chọn kỳ hạn trả góp:
                    </span>
                    <Radio.Group
                      value={keHoachTraGop.soThang}
                      onChange={(e) => tinhTraGop(e.target.value)}
                      style={{ width: "100%" }}
                    >
                      <Space direction="vertical" style={{ width: "100%" }}>
                        {[3, 6, 12, 24].map((months) => {
                          const monthlyAmount = Math.ceil(tongTien / months);
                          const totalWithInterest = monthlyAmount * months;
                          const interestRate =
                            months <= 6 ? 0 : months <= 12 ? 5 : 10;
                          const finalTotal = Math.ceil(
                            totalWithInterest * (1 + interestRate / 100)
                          );
                          const finalMonthly = Math.ceil(finalTotal / months);

                          return (
                            <Card
                              key={months}
                              size="small"
                              style={{
                                backgroundColor:
                                  keHoachTraGop.soThang === months
                                    ? "#e6f7ff"
                                    : "#fafafa",
                                border:
                                  keHoachTraGop.soThang === months
                                    ? "1px solid #1890ff"
                                    : "1px solid #d9d9d9",
                              }}
                            >
                              <Radio value={months}>
                                <div>
                                  <div
                                    style={{
                                      fontWeight: "600",
                                      color: "#1890ff",
                                    }}
                                  >
                                    {months} tháng -{" "}
                                    {finalMonthly.toLocaleString()}₫/tháng
                                  </div>
                                  <div
                                    style={{ fontSize: "12px", color: "#666" }}
                                  >
                                    Lãi suất: {interestRate}% | Tổng:{" "}
                                    {finalTotal.toLocaleString()}₫
                                  </div>
                                </div>
                              </Radio>
                            </Card>
                          );
                        })}
                      </Space>
                    </Radio.Group>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#f0f9ff",
                      padding: "12px",
                      borderRadius: "6px",
                      border: "1px solid #91d5ff",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "600",
                        color: "#1890ff",
                        marginBottom: "4px",
                      }}
                    >
                      📋 Thông tin trả góp:
                    </div>
                    <div style={{ fontSize: "14px" }}>
                      • Số tiền gốc: {tongTien.toLocaleString()}₫
                    </div>
                    <div style={{ fontSize: "14px" }}>
                      • Số tháng: {keHoachTraGop.soThang} tháng
                    </div>
                    <div style={{ fontSize: "14px" }}>
                      • Số tiền/tháng:{" "}
                      {keHoachTraGop.tienHangThang.toLocaleString()}₫
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </Space>
        </Radio.Group>
      </Modal>

      {/* MODAL HÓA ĐƠN hiện đại */}
      <Modal
        title={
          <div
            style={{
              background: "#1890ff",
              margin: "-24px -24px 24px -24px",
              padding: "16px 24px",
              color: "white",
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            <CheckCircleOutlined
              style={{ marginRight: "12px", fontSize: "24px" }}
            />
            🎉 Hóa đơn thành công!
          </div>
        }
        open={modalThanhCong.open}
        onCancel={() =>
          setModalThanhCong({
            open: false,
            hoaDon: null,
            tienMat: 0,
            tienThoi: 0,
          })
        }
        footer={[
          <Button
            key="orders"
            type="primary"
            size="large"
            icon={<FileTextOutlined />}
            onClick={() => {
              setModalThanhCong({
                open: false,
                hoaDon: null,
                tienMat: 0,
                tienThoi: 0,
              });
              navigate("/pos/orders");
            }}
            style={{
              borderRadius: "10px",
              background: "linear-gradient(45deg, #36d1dc 0%, #5b86e5 100%)",
              border: "none",
              fontWeight: "500",
            }}
          >
            📋 Xem đơn hôm nay
          </Button>,
        ]}
        width={600}
        style={{ top: 20 }}
        bodyStyle={{ padding: "24px" }}
      >
        {modalThanhCong.hoaDon && (
          <div
            style={{
              background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
              padding: "24px",
              borderRadius: "12px",
            }}
          >
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <div style={{ textAlign: "center" }}>
                <Text
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#1890ff",
                  }}
                >
                  HÓA ĐƠN BÁN HÀNG #{modalThanhCong.hoaDon?.id}
                </Text>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  backgroundColor: "white",
                  padding: "16px",
                  borderRadius: "8px",
                }}
              >
                <div>
                  <Text strong style={{ color: "#722ed1" }}>
                    👤 Thu ngân:
                  </Text>
                  <br />
                  <Text style={{ fontSize: "16px" }}>
                    {modalThanhCong.hoaDon?.nhan_vien?.ho_ten || hoTen}
                  </Text>
                </div>
                <div>
                  <Text strong style={{ color: "#722ed1" }}>
                    🕐 Thời gian:
                  </Text>
                  <br />
                  <Text style={{ fontSize: "16px" }}>
                    {new Date(modalThanhCong.hoaDon?.ngay_ban).toLocaleString()}
                  </Text>
                </div>
              </div>

              {/* Thông tin phương thức thanh toán */}
              <div
                style={{
                  backgroundColor: "white",
                  padding: "16px",
                  borderRadius: "8px",
                  border: "2px solid #1890ff",
                }}
              >
                <Text strong style={{ color: "#1890ff", fontSize: "16px" }}>
                  💳 Phương thức thanh toán:
                </Text>
                <div style={{ marginTop: "8px" }}>
                  {modalThanhCong.hoaDon?.phuong_thuc_thanh_toan === "cash" && (
                    <Space align="center">
                      <DollarOutlined
                        style={{ color: "#52c41a", fontSize: "18px" }}
                      />
                      <Text
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#52c41a",
                        }}
                      >
                        💵 Tiền mặt
                      </Text>
                    </Space>
                  )}
                  {modalThanhCong.hoaDon?.phuong_thuc_thanh_toan === "card" && (
                    <Space align="center">
                      <CreditCardOutlined
                        style={{ color: "#722ed1", fontSize: "18px" }}
                      />
                      <Text
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#722ed1",
                        }}
                      >
                        💳 Thanh toán thẻ
                      </Text>
                    </Space>
                  )}
                  {modalThanhCong.hoaDon?.phuong_thuc_thanh_toan ===
                    "transfer" && (
                    <Space align="center">
                      <QrcodeOutlined
                        style={{ color: "#fa8c16", fontSize: "18px" }}
                      />
                      <Text
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#fa8c16",
                        }}
                      >
                        📱 Chuyển khoản/QR
                      </Text>
                    </Space>
                  )}
                  {modalThanhCong.hoaDon?.phuong_thuc_thanh_toan ===
                    "installment" && (
                    <Space align="center">
                      <ScheduleOutlined
                        style={{ color: "#13c2c2", fontSize: "18px" }}
                      />
                      <Text
                        style={{
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#13c2c2",
                        }}
                      >
                        📅 Trả góp ({keHoachTraGop.soThang} tháng)
                      </Text>
                    </Space>
                  )}
                </div>
              </div>

              <Table
                tableLayout="fixed"
                rowKey={(r) => `${r.id}-${r.id_san_pham}`}
                dataSource={modalThanhCong.hoaDon?.chi_tiet_hoa_don_ban || []}
                pagination={false}
                size="middle"
                style={{
                  backgroundColor: "white",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
                columns={[
                  {
                    title: "Sản phẩm",
                    dataIndex: ["san_pham", "ten_san_pham"],
                    ellipsis: true,
                    render: (text) => (
                      <Text strong style={{ color: "#1890ff" }}>
                        {text}
                      </Text>
                    ),
                  },
                  {
                    title: "SL",
                    dataIndex: "so_luong",
                    align: "center",
                    width: 80,
                    render: (text) => (
                      <Badge
                        count={text}
                        style={{
                          backgroundColor: text <= 10 ? "#ff4d4f" : "#52c41a",
                          color: "white",
                          fontWeight: "bold",
                        }}
                      />
                    ),
                  },
                  {
                    title: "Đơn giá",
                    dataIndex: "don_gia",
                    align: "right",
                    width: 120,
                    render: (v) => (
                      <Text style={{ color: "black", fontWeight: "500" }}>
                        {Number(v).toLocaleString()}₫
                      </Text>
                    ),
                  },
                  {
                    title: "Thành tiền",
                    align: "right",
                    width: 140,
                    render: (_, r) => (
                      <Text
                        style={{
                          color: "black",
                          fontWeight: "600",
                          fontSize: "15px",
                        }}
                      >
                        {(Number(r.don_gia) * r.so_luong).toLocaleString()}₫
                      </Text>
                    ),
                  },
                ]}
              />

              <div
                style={{
                  backgroundColor: "white",
                  padding: "20px",
                  borderRadius: "8px",
                  textAlign: "right",
                }}
              >
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: "100%" }}
                >
                  {/* Hiển thị các mục này nếu là thanh toán tiền mặt */}
                  {modalThanhCong.hoaDon?.phuong_thuc_thanh_toan === "cash" && (
                    <>
                      {/* 1. Tiền khách đưa */}
                      <div style={{ fontSize: "16px" }}>
                        <Text strong style={{ color: "#1890ff" }}>
                          Tiền khách đưa:{" "}
                        </Text>
                        <Text style={{ fontWeight: "600" }}>
                          {Number(modalThanhCong.tienMat).toLocaleString()}₫
                        </Text>
                      </div>

                      {/* 2. Tiền thối (không có viền) */}
                      <div style={{ fontSize: "16px" }}>
                        <Text strong style={{ color: "#1890ff" }}>
                          Tiền thối:{" "}
                        </Text>
                        <Text
                          style={{
                            fontSize: "18px",
                            fontWeight: "700",
                            color: "#389e0d",
                          }}
                        >
                          {Number(modalThanhCong.tienThoi).toLocaleString()}₫
                        </Text>
                      </div>
                    </>
                  )}
                  {/* 3. Tổng tiền (có viền xanh) */}
                  <div
                    style={{
                      fontSize: "16px",
                      padding: "10px",
                      backgroundColor: "#f6ffed",
                      borderRadius: "6px",
                      border: "1px solid #b7eb8f",
                    }}
                  >
                    <Text strong style={{ color: "#1890ff" }}>
                      Tổng tiền:{" "}
                    </Text>
                    <Text
                      style={{
                        fontSize: "18px",
                        fontWeight: "700",
                        color: "#f5222d",
                      }}
                    >
                      {Number(
                        modalThanhCong.hoaDon?.tong_tien
                      ).toLocaleString()}
                      ₫
                    </Text>
                  </div>
                  {modalThanhCong.hoaDon?.phuong_thuc_thanh_toan === "card" && (
                    <div
                      style={{
                        fontSize: "16px",
                        padding: "12px",
                        backgroundColor: "#f9f0ff",
                        borderRadius: "6px",
                        border: "1px solid #d3adf7",
                      }}
                    >
                      <Text strong style={{ color: "#722ed1" }}>
                        💳 Thanh toán thẻ thành công
                      </Text>
                      <br />
                      <Text style={{ fontSize: "14px", color: "#666" }}>
                        Giao dịch đã được xử lý an toàn
                      </Text>
                    </div>
                  )}
                  {modalThanhCong.hoaDon?.phuong_thuc_thanh_toan ===
                    "transfer" && (
                    <div
                      style={{
                        fontSize: "16px",
                        padding: "12px",
                        backgroundColor: "#fff7e6",
                        borderRadius: "6px",
                        border: "1px solid #ffd591",
                      }}
                    >
                      <Text strong style={{ color: "#fa8c16" }}>
                        📱 Chuyển khoản thành công
                      </Text>
                      <br />
                      <Text style={{ fontSize: "14px", color: "#666" }}>
                        Số tiền đã được chuyển vào tài khoản
                      </Text>
                    </div>
                  )}
                  {modalThanhCong.hoaDon?.phuong_thuc_thanh_toan ===
                    "installment" && (
                    <div
                      style={{
                        fontSize: "16px",
                        padding: "12px",
                        backgroundColor: "#e6fffb",
                        borderRadius: "6px",
                        border: "1px solid #87e8de",
                      }}
                    >
                      <Text strong style={{ color: "#13c2c2" }}>
                        📅 Trả góp đã được thiết lập
                      </Text>
                      <br />
                      <Text style={{ fontSize: "14px", color: "#666" }}>
                        Kỳ hạn: {keHoachTraGop.soThang} tháng -{" "}
                        {keHoachTraGop.tienHangThang.toLocaleString()}₫/tháng
                      </Text>
                    </div>
                  )}
                </Space>
              </div>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Pos;
