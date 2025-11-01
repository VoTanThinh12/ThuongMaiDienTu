import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Form,
  Input,
  Radio,
  Button,
  message,
  Spin,
  Empty,
  Space,
  Tooltip,
} from "antd";
import { cartAPI, orderAPI, paymentAPI } from "../utils/api";
import VoucherButton from "../components/VoucherButton";
import QRPaymentModal from "../components/QRPaymentModal";
import "./Checkout.css";

const Checkout = ({ onCartUpdate }) => {
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const selectedMethod = Form.useWatch("phuong_thuc_thanh_toan", form);

  const [paymentConfig, setPaymentConfig] = useState(null);
  const bankInfo = paymentConfig?.bank || {
    vietqrBankCode: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
    branch: "",
  };
  const staticBank = {
    bankName: "Mbbank",
    accountName: "VO TAN THINH",
    accountNumber: "0346176591",
    branch: "Chi nhánh TP.HCM",
  };

  const [qrPaymentModal, setQrPaymentModal] = useState({
    visible: false,
    orderId: null,
    paymentMethod: null,
    amount: 0,
  });

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(`Đã sao chép ${label}`);
    } catch {
      message.error("Không thể sao chép, vui lòng copy thủ công");
    }
  };

  const openQRPaymentModal = (orderId, paymentMethod, amount) => {
    setQrPaymentModal({
      visible: true,
      orderId,
      paymentMethod,
      amount,
    });
  };

  const closeQRPaymentModal = () => {
    setQrPaymentModal({
      visible: false,
      orderId: null,
      paymentMethod: null,
      amount: 0,
    });
  };

  const handlePaymentSuccess = (data) => {
    // Dọn giỏ hàng đã chọn
    try {
      selectedItems.forEach(async (itemId) => {
        await cartAPI.removeFromCart(itemId);
      });
      localStorage.removeItem("selectedCartItems");
    } catch {}

    if (onCartUpdate) onCartUpdate();
    navigate(`/orders/${data.orderId}`);
  };

  const handlePaymentTimeout = (data) => {
    // Có thể hủy đơn hàng nếu cần
    message.warning("Giao dịch đã hết hạn!");
  };

  useEffect(() => {
    fetchCart();
    loadCustomerInfo();
    loadPaymentConfig();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await cartAPI.getCart();
      if (response.data.length === 0) {
        message.warning("Giỏ hàng trống");
        navigate("/cart");
        return;
      }

      // Lấy danh sách sản phẩm đã chọn từ localStorage
      const selectedItemIds = JSON.parse(
        localStorage.getItem("selectedCartItems") || "[]"
      );

      if (selectedItemIds.length === 0) {
        message.warning("Vui lòng chọn sản phẩm để đặt hàng");
        navigate("/cart");
        return;
      }

      // Chỉ lấy các sản phẩm đã được chọn
      const filteredItems = response.data.filter((item) =>
        selectedItemIds.includes(item.id)
      );

      if (filteredItems.length === 0) {
        message.warning("Không tìm thấy sản phẩm đã chọn");
        navigate("/cart");
        return;
      }

      setCartItems(filteredItems);
      setSelectedItems(selectedItemIds);
    } catch (error) {
      message.error("Lỗi khi tải giỏ hàng");
      navigate("/cart");
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerInfo = () => {
    const customerInfo = JSON.parse(
      localStorage.getItem("customerInfo") || "{}"
    );
    form.setFieldsValue({
      ho_ten_nguoi_nhan: customerInfo.ho_ten || "",
      so_dien_thoai: customerInfo.so_dien_thoai || "",
      phuong_thuc_thanh_toan: "cod",
    });
  };

  const loadPaymentConfig = async () => {
    try {
      const { data } = await paymentAPI.getPublicConfig();
      setPaymentConfig(data);
    } catch (e) {
      console.error("Load payment config error", e);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + Number(item.san_pham.gia_ban) * item.so_luong;
    }, 0);
  };

  const calculateFinalTotal = () => {
    const subtotal = calculateTotal();
    const voucherDiscount = appliedVoucher ? appliedVoucher.so_tien_giam : 0;
    return Math.max(0, subtotal - voucherDiscount);
  };

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      // Thêm thông tin voucher vào order data
      const orderData = {
        ...values,
        voucher_info: appliedVoucher
          ? {
              ma_voucher: appliedVoucher.voucher.ma_voucher,
              so_tien_giam: appliedVoucher.so_tien_giam,
            }
          : null,
        selected_item_ids: selectedItems,
      };

      const response = await orderAPI.createOrder(orderData);
      const orderId = response.data.don_hang.id;
      const orderCode = response.data.don_hang.ma_don_hang;

      const method = values.phuong_thuc_thanh_toan;
      const finalAmount = calculateFinalTotal();

      if (method === "bank_transfer") {
        // Sử dụng QR Payment Modal cho bank transfer
        openQRPaymentModal(orderId, "bank", finalAmount);
        return;
      }

      if (method === "momo") {
        // Sử dụng QR Payment Modal cho MoMo
        openQRPaymentModal(orderId, "momo", finalAmount);
        return;
      }

      if (method === "cod") {
        // Hiển thị thông tin COD
        message.success(
          "Đặt hàng thành công! Vui lòng chuẩn bị thanh toán tiền mặt khi nhận hàng."
        );

        // Dọn giỏ hàng đã chọn
        try {
          for (const itemId of selectedItems) {
            await cartAPI.removeFromCart(itemId);
          }
          localStorage.removeItem("selectedCartItems");
        } catch {}
        if (onCartUpdate) onCartUpdate();

        navigate(`/orders/${orderId}`);
        return;
      }

      if (method === "stripe") {
        const { data } = await paymentAPI.createStripeForCustomer(orderId);
        if (data?.url) {
          window.location.href = data.url; // Stripe sẽ điều hướng trang
          return;
        }
      }

      // Với bank_transfer hoặc credit_card (placeholder), chỉ điều hướng về chi tiết đơn
      message.success("Đặt hàng thành công!");

      try {
        for (const itemId of selectedItems) {
          await cartAPI.removeFromCart(itemId);
        }
        localStorage.removeItem("selectedCartItems");
      } catch (cartError) {
        console.error("Lỗi khi xóa sản phẩm khỏi giỏ hàng:", cartError);
      }

      if (onCartUpdate) onCartUpdate();
      navigate(`/orders/${orderId}`);
    } catch (error) {
      message.error(
        error.response?.data?.error || "Có lỗi xảy ra khi đặt hàng!"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <Empty description="Giỏ hàng trống" />
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1>Thanh toán ({cartItems.length} sản phẩm)</h1>

      <div className="checkout-content">
        <div className="checkout-form">
          <Card title="Thông tin giao hàng">
            <Form form={form} layout="vertical" onFinish={onFinish}>
              <Form.Item
                name="ho_ten_nguoi_nhan"
                label="Họ tên người nhận"
                rules={[{ required: true, message: "Vui lòng nhập họ tên!" }]}
              >
                <Input size="large" placeholder="Nguyễn Văn A" />
              </Form.Item>
              <Form.Item
                name="so_dien_thoai"
                label="Số điện thoại"
                rules={[
                  { required: true, message: "Vui lòng nhập số điện thoại!" },
                  {
                    pattern: /^[0-9]{10,11}$/,
                    message: "Số điện thoại không hợp lệ!",
                  },
                ]}
              >
                <Input size="large" placeholder="0909123456" />
              </Form.Item>
              <Form.Item
                name="dia_chi_giao_hang"
                label="Địa chỉ giao hàng"
                rules={[{ required: true, message: "Vui lòng nhập địa chỉ!" }]}
              >
                <Input.TextArea
                  rows={3}
                  size="large"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                />
              </Form.Item>
              <Form.Item name="ghi_chu" label="Ghi chú (tùy chọn)">
                <Input.TextArea
                  rows={2}
                  size="large"
                  placeholder="Ghi chú cho người giao hàng..."
                />
              </Form.Item>
              <Form.Item
                name="phuong_thuc_thanh_toan"
                label="Phương thức thanh toán"
                rules={[{ required: true }]}
              >
                <Radio.Group>
                  <Space direction="vertical" size={14}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>
                        1) Thanh toán khi nhận hàng
                      </div>
                      <Radio value="cod">COD - Trả tiền mặt khi nhận</Radio>
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, margin: "10px 0 6px" }}>
                        2) Ngân hàng & Ví điện tử nội địa
                      </div>
                      <Space direction="vertical">
                        <Radio value="bank_transfer">
                          Chuyển khoản ngân hàng (Vietcombank)
                        </Radio>
                        <Radio value="momo">Ví MoMo</Radio>
                      </Space>
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, margin: "10px 0 6px" }}>
                        3) Thẻ quốc tế & cổng toàn cầu
                      </div>
                      <Space direction="vertical">
                        <Radio value="stripe">Stripe (Visa/MasterCard)</Radio>
                      </Space>
                    </div>
                  </Space>
                </Radio.Group>
              </Form.Item>
            </Form>
          </Card>
        </div>

        <div className="checkout-summary">
          <Card title="Đơn hàng của bạn">
            <div className="order-items">
              {cartItems.map((item) => (
                <div key={item.id} className="order-item">
                  <div className="order-item-info">
                    <span className="order-item-name">
                      {item.san_pham.ten_san_pham}
                    </span>
                    <span className="order-item-qty">x{item.so_luong}</span>
                  </div>
                  <span className="order-item-price">
                    {formatCurrency(
                      Number(item.san_pham.gia_ban) * item.so_luong
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="order-summary-divider"></div>

            <div className="order-summary-row">
              <span>Tạm tính:</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
            <div className="order-summary-row">
              <span>Phí vận chuyển:</span>
              <span>Miễn phí</span>
            </div>

            {/* Voucher Section */}
            <VoucherButton
              onVoucherApplied={setAppliedVoucher}
              appliedVoucher={appliedVoucher}
              tongTienGioHang={calculateTotal()}
            />

            {appliedVoucher && (
              <div className="order-summary-row voucher-discount">
                <span>Giảm giá ({appliedVoucher.voucher.ten_voucher}):</span>
                <span className="discount-amount">
                  -{formatCurrency(appliedVoucher.so_tien_giam)}
                </span>
              </div>
            )}

            <div className="order-summary-divider"></div>

            <div className="order-summary-row total">
              <span>Tổng cộng:</span>
              <span className="total-amount">
                {formatCurrency(calculateFinalTotal())}
              </span>
            </div>

            <Button
              type="primary"
              size="large"
              block
              loading={submitting}
              onClick={() => form.submit()}
            >
              Đặt hàng
            </Button>
          </Card>
        </div>
      </div>

      {/* QR Payment Modal */}
      <QRPaymentModal
        visible={qrPaymentModal.visible}
        onClose={closeQRPaymentModal}
        orderId={qrPaymentModal.orderId}
        paymentMethod={qrPaymentModal.paymentMethod}
        amount={qrPaymentModal.amount}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentTimeout={handlePaymentTimeout}
      />
    </div>
  );
};

export default Checkout;
