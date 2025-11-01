const axios = require("axios");

class SepayService {
  constructor() {
    this.apiUrl = process.env.SEPAY_API_URL || "https://my.sepay.vn/userapi";
    this.token = process.env.SEPAY_TOKEN;
    this.webhookSecret = process.env.BANK_WEBHOOK_SECRET;
  }

  // Tạo QR thanh toán qua Sepay API
  async createQRPayment(orderId, amount, description) {
    try {
      if (!this.token) {
        throw new Error("SEPAY_TOKEN not configured");
      }

      const payload = {
        bank_code: "MB",
        account_number: process.env.VIETQR_ACCOUNT_NUMBER || "0346176591",
        account_name: process.env.VIETQR_ACCOUNT_NAME || "VO TAN THINH",
        amount: Number(amount),
        content: description,
        webhook_url:
          process.env.SEPAY_WEBHOOK_URL ||
          `${
            process.env.APP_URL || "http://localhost:3001"
          }/api/qr-payment/webhook/bank`,
      };

      console.log("🔗 Creating Sepay QR Payment:", payload);

      const response = await axios.post(`${this.apiUrl}/create-qr`, payload, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      if (!response.data || !response.data.success) {
        throw new Error(
          `Sepay API error: ${response.data?.message || "Unknown error"}`
        );
      }

      const data = response.data.data;

      console.log("✅ Sepay QR Created:", {
        qr_url: data.qr_url,
        content: data.content,
        sepay_id: data.id,
      });

      return {
        qrUrl: data.qr_url,
        qrContent: data.content,
        sepayId: data.id,
        bankInfo: {
          bankCode: "MB",
          accountNumber: payload.account_number,
          accountName: payload.account_name,
        },
      };
    } catch (error) {
      console.error("❌ Sepay API Error:", error.message);
      if (error.response) {
        console.error("Response:", error.response.data);
      }
      throw new Error(`Không thể tạo QR Sepay: ${error.message}`);
    }
  }

  // Kiểm tra trạng thái giao dịch
  async checkTransaction(sepayId) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/transaction/${sepayId}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("❌ Check Sepay transaction error:", error.message);
      throw error;
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret) return true; // Skip in dev

    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest("hex");

    return signature === expectedSignature;
  }
}

module.exports = new SepayService();
