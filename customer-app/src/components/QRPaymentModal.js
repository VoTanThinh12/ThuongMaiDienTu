import React, { useState, useEffect } from "react";
import { Modal, Button, message, Spin, Alert, Progress } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import io from "socket.io-client";

const QRPaymentModal = ({
  visible,
  onClose,
  orderId,
  paymentMethod,
  amount,
  onPaymentSuccess,
  onPaymentTimeout,
}) => {
  const [socket, setSocket] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading, pending, success, timeout, error
  const [countdown, setCountdown] = useState(60);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && orderId) {
      initializePayment();
    }
  }, [visible, orderId, paymentMethod]);

  useEffect(() => {
    if (visible) {
      // Kết nối Socket.IO
      const newSocket = io("http://localhost:3001", {
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true,
      });

      newSocket.on("connect", () => {
        console.log("🔌 Socket.IO connected:", newSocket.id);
      });

      newSocket.on("disconnect", () => {
        console.log("🔌 Socket.IO disconnected");
      });

      newSocket.on("connect_error", (error) => {
        console.error("🔌 Socket.IO connection error:", error);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [visible]);

  useEffect(() => {
    if (socket && paymentData) {
      // Join room để nhận thông báo
      socket.emit("join-transaction", paymentData.transactionId);

      // Lắng nghe sự kiện thanh toán thành công
      socket.on("payment-success", (data) => {
        if (data.transactionId === paymentData.transactionId) {
          // Chỉ hiển thị thành công khi thực sự chuyển tiền VÀ đã được verified
          if (data.isRealPayment && data.verified) {
            setStatus("success");
            message.success("Thanh toán thành công! Đặt hàng thành công!");
            setTimeout(() => {
              onPaymentSuccess && onPaymentSuccess(data);
              onClose();
            }, 2000);
          } else {
            console.log("⚠️ Received payment success but not verified:", data);
          }
        }
      });

      // Lắng nghe sự kiện timeout
      socket.on("payment-timeout", (data) => {
        if (data.transactionId === paymentData.transactionId) {
          setStatus("timeout");
          message.warning("Giao dịch đã hết hạn!");
          setTimeout(() => {
            onPaymentTimeout && onPaymentTimeout(data);
            onClose();
          }, 3000);
        }
      });

      return () => {
        if (paymentData) {
          socket.emit("leave-transaction", paymentData.transactionId);
        }
      };
    }
  }, [socket, paymentData]);

  // Manual payment success trigger (for testing only)
  const triggerPaymentSuccess = () => {
    if (status === "pending" && paymentData) {
      console.log("🎉 Manual payment success triggered (TEST ONLY)...");
      setStatus("success");
      message.success("Thanh toán thành công! (TEST)");
      setTimeout(() => {
        onPaymentSuccess &&
          onPaymentSuccess({
            orderId,
            transactionId: paymentData.transactionId,
          });
        onClose();
      }, 2000);
    }
  };

  useEffect(() => {
    if (status === "pending" && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && status === "pending") {
      setStatus("timeout");
      message.error("Giao dịch đã hết hạn! Vui lòng thử lại.");
      setTimeout(() => {
        onPaymentTimeout &&
          onPaymentTimeout({
            orderId,
            transactionId: paymentData?.transactionId,
          });
        onClose();
      }, 2000);
    }
  }, [countdown, status, orderId, paymentData, onPaymentTimeout, onClose]);

  // Lắng nghe Socket.IO events cho timeout và success
  useEffect(() => {
    if (socket && paymentData) {
      const transactionId = paymentData.transactionId;

      // Join room cho transaction này
      socket.emit("join-transaction", transactionId);

      // Lắng nghe payment success
      socket.on("payment-success", (data) => {
        console.log("🎉 Payment success received:", data);
        if (data.transactionId === transactionId) {
          setStatus("success");
          message.success("Thanh toán thành công! Đơn hàng đã được xác nhận.");
          setTimeout(() => {
            onPaymentSuccess && onPaymentSuccess(data);
            onClose();
          }, 2000);
        }
      });

      // Lắng nghe payment timeout
      socket.on("payment-timeout", (data) => {
        console.log("⏰ Payment timeout received:", data);
        if (data.transactionId === transactionId) {
          setStatus("timeout");
          message.error("Giao dịch đã hết hạn! Vui lòng thử lại.");
          setTimeout(() => {
            onPaymentTimeout && onPaymentTimeout(data);
            onClose();
          }, 2000);
        }
      });

      return () => {
        socket.emit("leave-transaction", transactionId);
        socket.off("payment-success");
        socket.off("payment-timeout");
      };
    }
  }, [socket, paymentData, onPaymentSuccess, onPaymentTimeout, onClose]);

  const initializePayment = async () => {
    setLoading(true);
    setStatus("loading");

    try {
      if (paymentMethod === "bank") {
        // Gọi API để tạo QR code thực từ VietQR
        const baseURL = "http://localhost:3001/api";
        const endpoint = `${baseURL}/qr-payment/bank/${orderId}`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("customerToken")}`,
          },
        });

        if (!response.ok) {
          throw new Error("Lỗi tạo QR thanh toán");
        }

        const result = await response.json();
        const paymentData = result.data;

        setPaymentData(paymentData);
        setStatus("pending");
        setCountdown(60);

        setLoading(false);
        return;
      }

      // MoMo: tạo ảnh QR từ "ma momo.png" và overlay số tiền + nội dung (hiển thị trực quan)
      const composedDataUrl = await generateMomoOverlayImage(
        "/ma momo.png",
        amount,
        orderId
      );
      const paymentData = {
        transactionId: `momo_${orderId}_${Date.now()}`,
        orderId,
        qrCodeDataURL: composedDataUrl,
        qrContent: composedDataUrl,
        amount,
        expiresAt: new Date(Date.now() + 60000),
      };

      setPaymentData(paymentData);
      setStatus("pending");
      setCountdown(60);
    } catch (error) {
      console.error("Error creating payment:", error);
      setStatus("error");
      message.error("Lỗi tạo thanh toán");
    } finally {
      setLoading(false);
    }
  };

  // Vẽ overlay MoMo: trả về dataURL
  const generateMomoOverlayImage = (src, amountValue, orderCode) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const size = 300;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size + 90; // thêm không gian cho text
        const ctx = canvas.getContext("2d");

        // Vẽ QR gốc
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, size, size);

        // Vùng nền cho text
        const panelY = size;
        ctx.fillStyle = "#fff0f6";
        ctx.fillRect(0, panelY, size, 90);
        ctx.strokeStyle = "#ffd6e7";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, panelY, size, 90);

        // Text tiêu đề
        ctx.fillStyle = "#c41d7f";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          "MoMo - Quét và xác nhận thanh toán",
          size / 2,
          panelY + 22
        );

        // Dòng số tiền
        ctx.fillStyle = "#eb2f96";
        ctx.font = "bold 18px Arial";
        const amountText = `Số tiền: ${new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(amountValue)}`;
        ctx.fillText(amountText, size / 2, panelY + 45);

        // Dòng nội dung
        ctx.fillStyle = "#8c8c8c";
        ctx.font = "14px Arial";
        const noteText = `Nội dung: ${orderCode}`;
        ctx.fillText(noteText, size / 2, panelY + 68);

        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  const cancelTransaction = async () => {
    setStatus("timeout");
    message.info("Đã hủy giao dịch");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getStatusIcon = () => {
    switch (status) {
      case "loading":
        return <Spin size="large" />;
      case "pending":
        return (
          <ClockCircleOutlined style={{ fontSize: 48, color: "#1890ff" }} />
        );
      case "success":
        return (
          <CheckCircleOutlined style={{ fontSize: 48, color: "#52c41a" }} />
        );
      case "timeout":
        return (
          <CloseCircleOutlined style={{ fontSize: 48, color: "#ff4d4f" }} />
        );
      case "error":
        return (
          <CloseCircleOutlined style={{ fontSize: 48, color: "#ff4d4f" }} />
        );
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "loading":
        return "Đang tạo QR thanh toán...";
      case "pending":
        return `Demo: Quét QR để thanh toán ${formatCurrency(amount)}`;
      case "success":
        return "Demo: Thanh toán thành công!";
      case "timeout":
        return "Giao dịch đã hết hạn!";
      case "error":
        return "Có lỗi xảy ra!";
      default:
        return "";
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case "pending":
        return `Thời gian còn lại: ${countdown} giây`;
      case "success":
        return "Đơn hàng của bạn đã được xác nhận";
      case "timeout":
        return "Vui lòng thử lại hoặc chọn phương thức thanh toán khác";
      case "error":
        return "Vui lòng thử lại";
      default:
        return "";
    }
  };

  return (
    <Modal
      title={`💳 Thanh toán ${paymentMethod === "bank" ? "ngân hàng" : "MoMo"}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      centered
      style={{ top: 10 }}
    >
      <div style={{ padding: "10px 0" }}>
        {/* Status Message */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            {getStatusMessage()}
          </div>
          <div style={{ color: "#666", fontSize: 14 }}>
            {getStatusDescription()}
          </div>
        </div>

        {/* Progress Bar for Countdown */}
        {status === "pending" && (
          <div style={{ marginBottom: 25 }}>
            <Progress
              percent={Math.round((countdown / 60) * 100)}
              status="active"
              strokeColor="#1890ff"
              format={() => `${countdown}s`}
            />
          </div>
        )}

        {/* Main Content - Centered Layout - BANK */}
        {status === "pending" && paymentMethod === "bank" && (
          <div>
            {/* QR Code - Center */}
            <div style={{ textAlign: "center", marginBottom: 25 }}>
              <div
                style={{
                  marginBottom: 15,
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#1890ff",
                }}
              >
                📱 Quét mã QR để thanh toán
              </div>
              {paymentData?.qrCodeDataURL ? (
                <img
                  src={paymentData.qrContent}
                  alt="QR Code"
                  style={{
                    width: 300,
                    height: 300,
                    border: "4px solid #1890ff",
                    borderRadius: 20,
                    boxShadow: "0 12px 32px rgba(24, 144, 255, 0.4)",
                  }}
                />
              ) : (
                <img
                  src={paymentData?.qrContent || "/cuối-cùng.png"}
                  alt="QR Code"
                  style={{
                    width: 300,
                    height: 300,
                    border: "4px solid #1890ff",
                    borderRadius: 20,
                    boxShadow: "0 12px 32px rgba(24, 144, 255, 0.4)",
                  }}
                />
              )}
            </div>

            {/* Payment Info - Compact */}
            {paymentData && (
              <div
                style={{
                  backgroundColor: "#f8f9fa",
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "15px",
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontSize: 15 }}>
                    <span style={{ color: "#666", fontSize: 13 }}>
                      🏦 Ngân hàng:
                    </span>
                    <br />
                    <strong style={{ fontSize: 16 }}>
                      {paymentData.bankInfo?.bankName || "MB Bank"}
                    </strong>
                  </div>
                  <div style={{ fontSize: 15 }}>
                    <span style={{ color: "#666", fontSize: 13 }}>
                      🏢 Chi nhánh:
                    </span>
                    <br />
                    <strong style={{ fontSize: 16 }}>
                      {paymentData.bankInfo?.branch || "Chi nhánh TP.HCM"}
                    </strong>
                  </div>
                  <div style={{ fontSize: 15 }}>
                    <span style={{ color: "#666", fontSize: 13 }}>
                      💳 Số tài khoản:
                    </span>
                    <br />
                    <strong style={{ color: "#1890ff", fontSize: 16 }}>
                      {paymentData.bankInfo?.accountNumber || "0346176591"}
                    </strong>
                  </div>
                  <div style={{ fontSize: 15 }}>
                    <span style={{ color: "#666", fontSize: 13 }}>
                      👤 Tên tài khoản:
                    </span>
                    <br />
                    <strong style={{ fontSize: 16 }}>
                      {paymentData.bankInfo?.accountName || "VO TAN THINH"}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#e6f7ff",
                    border: "1px solid #91d5ff",
                    borderRadius: 8,
                    padding: 18,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#1890ff",
                      marginBottom: 10,
                    }}
                  >
                    💰 {formatCurrency(paymentData.amount)}
                  </div>
                  <div style={{ fontSize: 14, color: "#666" }}>
                    <div style={{ marginBottom: 4 }}>
                      <strong>Nội dung:</strong> {paymentData.orderId}
                    </div>
                    <div>
                      <strong>Mã xác minh:</strong>{" "}
                      {paymentData.verificationCode}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {/* <div style={{ textAlign: 'center', marginTop: 20 }}>
              {status === 'pending' && (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <Button 
                    type="primary" 
                    onClick={triggerPaymentSuccess}
                    size="large"
                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  >
                    ✅ Tôi đã chuyển tiền
                  </Button>
                  <Button 
                    type="primary" 
                    danger 
                    onClick={cancelTransaction}
                    size="large"
                  >
                    ❌ Hủy giao dịch
                  </Button>
                </div>
              )}
              
              {(status === 'success' || status === 'timeout' || status === 'error') && (
                <Button type="primary" onClick={onClose} size="large">
                  Đóng
                </Button>
              )}
            </div> */}

            {/* Quick Instructions */}
            {status === "pending" && (
              <div
                style={{
                  marginTop: 25,
                  padding: 18,
                  backgroundColor: "#f0f9ff",
                  borderRadius: 10,
                  border: "1px solid #bae6fd",
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    color: "#0369a1",
                    textAlign: "center",
                  }}
                >
                  <div style={{ marginBottom: 8, fontWeight: 600 }}>
                    <strong>💡 Hướng dẫn:</strong> Mở app ngân hàng → Quét QR →
                    Xác nhận thanh toán
                  </div>
                  <div
                    style={{ fontSize: 14, color: "#0ea5e9", fontWeight: 500 }}
                  >
                    QR code đã chứa sẵn số tiền và nội dung!
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content - Centered Layout - MOMO */}
        {status === "pending" && paymentMethod === "momo" && (
          <div>
            {/* QR Code - Center */}
            <div style={{ textAlign: "center", marginBottom: 25 }}>
              <div
                style={{
                  marginBottom: 15,
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#eb2f96",
                }}
              >
                📱 Quét mã QR MoMo để thanh toán
              </div>
              {paymentData?.qrCodeDataURL ? (
                <img
                  src={paymentData.qrCodeDataURL}
                  alt="QR MoMo"
                  style={{
                    width: 300,
                    height: 300,
                    border: "4px solid #eb2f96",
                    borderRadius: 20,
                    boxShadow: "0 12px 32px rgba(235, 47, 150, 0.35)",
                  }}
                />
              ) : (
                <img
                  src="/ma momo.png"
                  alt="QR MoMo"
                  style={{
                    width: 300,
                    height: 300,
                    border: "4px solid #eb2f96",
                    borderRadius: 20,
                    boxShadow: "0 12px 32px rgba(235, 47, 150, 0.35)",
                  }}
                />
              )}
            </div>

            {/* Payment Info - Compact */}
            {paymentData && (
              <div
                style={{
                  backgroundColor: "#fff0f6",
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 20,
                  border: "1px solid #ffd6e7",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#fff1f0",
                    border: "1px solid #ffccc7",
                    borderRadius: 8,
                    padding: 18,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#eb2f96",
                      marginBottom: 10,
                    }}
                  >
                    💰 {formatCurrency(paymentData.amount)}
                  </div>
                  <div style={{ fontSize: 14, color: "#595959" }}>
                    <div style={{ marginBottom: 4 }}>
                      <strong>Nội dung:</strong> {paymentData.orderId}
                    </div>
                    <div>
                      <strong>Phương thức:</strong> MoMo QR (quét mã)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ textAlign: "center", marginTop: 20 }}>
              {status === "pending" && (
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                  }}
                >
                  <Button
                    type="primary"
                    onClick={triggerPaymentSuccess}
                    size="large"
                    style={{
                      backgroundColor: "#52c41a",
                      borderColor: "#52c41a",
                    }}
                  >
                    ✅ Tôi đã chuyển tiền
                  </Button>
                  <Button
                    type="primary"
                    danger
                    onClick={cancelTransaction}
                    size="large"
                  >
                    ❌ Hủy giao dịch
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Instructions */}
            {status === "pending" && (
              <div
                style={{
                  marginTop: 25,
                  padding: 18,
                  backgroundColor: "#fff0f6",
                  borderRadius: 10,
                  border: "1px solid #ffd6e7",
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    color: "#c41d7f",
                    textAlign: "center",
                  }}
                >
                  <div style={{ marginBottom: 8, fontWeight: 600 }}>
                    <strong>💡 Hướng dẫn:</strong> Mở app MoMo → Quét QR → Xác
                    nhận thanh toán
                  </div>
                  <div
                    style={{ fontSize: 14, color: "#eb2f96", fontWeight: 500 }}
                  >
                    QR code có thể là ảnh tĩnh do shop cung cấp.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QRPaymentModal;
