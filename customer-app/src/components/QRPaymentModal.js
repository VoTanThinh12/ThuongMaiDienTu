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
      const baseURL = process.env.REACT_APP_API_URL || "http://localhost:3001";
      // Kết nối Socket.IO với baseURL có thể cấu hình qua env
      const newSocket = io(baseURL, {
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
      const transactionId = paymentData.transactionId;
      // Join room để nhận thông báo
      socket.emit("join-transaction", transactionId);

      // Lắng nghe sự kiện thanh toán thành công (payload tối giản từ server)
      const onSuccess = (data) => {
        if (data.transactionId === transactionId) {
          setStatus("success");
          message.success("Thanh toán thành công! Đơn hàng đã được xác nhận.");
          setTimeout(() => {
            onPaymentSuccess && onPaymentSuccess(data);
            onClose();
          }, 1500);
        }
      };

      // Lắng nghe sự kiện timeout
      const onTimeout = (data) => {
        if (data.transactionId === transactionId) {
          setStatus("timeout");
          message.error("Giao dịch đã hết hạn! Vui lòng thử lại.");
          setTimeout(() => {
            onPaymentTimeout && onPaymentTimeout(data);
            onClose();
          }, 1500);
        }
      };

      socket.on("payment-success", onSuccess);
      socket.on("payment-timeout", onTimeout);

      return () => {
        socket.emit("leave-transaction", transactionId);
        socket.off("payment-success", onSuccess);
        socket.off("payment-timeout", onTimeout);
      };
    }
  }, [socket, paymentData, onPaymentSuccess, onPaymentTimeout, onClose]);

  const initializePayment = async () => {
    setLoading(true);
    setStatus("loading");

    try {
      if (paymentMethod === "bank") {
        const baseApi = process.env.REACT_APP_API_BASE || "http://localhost:3001/api";
        const endpoint = `${baseApi}/qr-payment/bank/${orderId}`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("customerToken")}`,
          },
        });

        if (!response.ok) throw new Error("Lỗi tạo QR thanh toán");

        const result = await response.json();
        const data = result.data;
        setPaymentData(data);
        setStatus("pending");
        setCountdown(60);
        setLoading(false);
        return;
      }

      // MoMo demo giữ nguyên
      const composedDataUrl = await generateMomoOverlayImage(
        "/ma momo.png",
        amount,
        orderId
      );
      const data = {
        transactionId: `momo_${orderId}_${Date.now()}`,
        orderId,
        qrCodeDataURL: composedDataUrl,
        qrContent: composedDataUrl,
        amount,
        expiresAt: new Date(Date.now() + 60000),
      };
      setPaymentData(data);
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

  const generateMomoOverlayImage = (src, amountValue, orderCode) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const size = 300;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size + 90;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, size, size);
        const panelY = size;
        ctx.fillStyle = "#fff0f6";
        ctx.fillRect(0, panelY, size, 90);
        ctx.strokeStyle = "#ffd6e7";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, panelY, 90, 90);
        ctx.fillStyle = "#c41d7f";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("MoMo - Quét và xác nhận thanh toán", size / 2, panelY + 22);
        ctx.fillStyle = "#eb2f96";
        ctx.font = "bold 18px Arial";
        const amountText = `Số tiền: ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amountValue)}`;
        ctx.fillText(amountText, size / 2, panelY + 45);
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

  const formatCurrency = (v) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);

  const getStatusMessage = () => {
    switch (status) {
      case "loading": return "Đang tạo QR thanh toán...";
      case "pending": return `Demo: Quét QR để thanh toán ${formatCurrency(amount)}`;
      case "success": return "Demo: Thanh toán thành công!";
      case "timeout": return "Giao dịch đã hết hạn!";
      case "error": return "Có lỗi xảy ra!";
      default: return "";
    }
  };

  return (
    <Modal title={`💳 Thanh toán ${paymentMethod === "bank" ? "ngân hàng" : "MoMo"}`} open={visible} onCancel={onClose} footer={null} width={700} centered style={{ top: 10 }}>
      <div style={{ padding: "10px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{getStatusMessage()}</div>
          {status === "pending" && <div style={{ color: "#666", fontSize: 14 }}>Thời gian còn lại: {countdown} giây</div>}
        </div>
        {status === "pending" && (
          <div style={{ marginBottom: 25 }}>
            <Progress percent={Math.round((countdown / 60) * 100)} status="active" strokeColor="#1890ff" format={() => `${countdown}s`} />
          </div>
        )}
        {status === "pending" && paymentMethod === "bank" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 25 }}>
              <div style={{ marginBottom: 15, fontSize: 18, fontWeight: 600, color: "#1890ff" }}>📱 Quét mã QR để thanh toán</div>
              <img src={paymentData?.qrContent || "/cuối-cùng.png"} alt="QR Code" style={{ width: 300, height: 300, border: "4px solid #1890ff", borderRadius: 20, boxShadow: "0 12px 32px rgba(24, 144, 255, 0.4)" }} />
            </div>
          </div>
        )}
        {status === "pending" && paymentMethod === "momo" && (
          <div style={{ textAlign: "center", marginBottom: 25 }}>
            <div style={{ marginBottom: 15, fontSize: 18, fontWeight: 600, color: "#eb2f96" }}>📱 Quét mã QR MoMo để thanh toán</div>
            <img src={paymentData?.qrCodeDataURL || "/ma momo.png"} alt="QR MoMo" style={{ width: 300, height: 300, border: "4px solid #eb2f96", borderRadius: 20, boxShadow: "0 12px 32px rgba(235, 47, 150, 0.35)" }} />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default QRPaymentModal;
