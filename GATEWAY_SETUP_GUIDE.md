# 🚀 Hướng dẫn thiết lập Gateway cho Webhook MB Bank

## 📋 Tổng quan

Hệ thống đã được cập nhật để hỗ trợ **MB Bank (0346176591 - VO TAN THINH)** với webhook tự động xác nhận thanh toán. Khi khách hàng chuyển khoản theo QR code, gateway sẽ gửi webhook về server và tự động hiển thị "đã thanh toán" cho khách hàng.

## 🔧 Các Gateway được hỗ trợ

### 1. **Sepay.vn** (Khuyên dùng) 🌟

**Ưu điểm:**
- Hỗ trợ MB Bank trực tiếp
- Webhook real-time
- API đơn giản, tài liệu rõ ràng
- Miễn phí với gói cơ bản

**Cách đăng ký:**
1. Truy cập: https://my.sepay.vn/register
2. Đăng ký tài khoản với thông tin:
   - Số tài khoản: `0346176591`
   - Chủ tài khoản: `VO TAN THINH`
   - Ngân hàng: `MB Bank`
3. Xác minh tài khoản bằng cách chuyển khoản thử
4. Lấy API Token từ dashboard
5. Cấu hình webhook URL: `https://your-domain.com/api/qr-payment/webhook/bank`

**Cấu hình .env:**
```bash
# Sepay Configuration
SEPAY_API_URL=https://my.sepay.vn/userapi
SEPAY_TOKEN=your_sepay_token_here
SEPAY_WEBHOOK_SECRET=your_sepay_webhook_secret
BANK_WEBHOOK_SECRET=your_sepay_webhook_secret
```

**Format webhook từ Sepay:**
```json
{
  "type": "transfer",
  "data": {
    "tid": "MB202510270001",
    "amount": 150000,
    "description": "Thanh toan don hang 12345 | Ma: 9A7B23",
    "transferNote": "Thanh toan don hang 12345 | Ma: 9A7B23",
    "accountNumber": "0346176591",
    "accountBankCode": "MB"
  }
}
```

### 2. **Casso.vn** (Alternative)

**Ưu điểm:**
- Đồng bộ sao kê tự động
- Hỗ trợ nhiều ngân hàng
- Webhook đáng tin cậy

**Cách đăng ký:**
1. Truy cập: https://casso.vn/register
2. Kết nối tài khoản MB Bank
3. Cấu hình webhook URL
4. Lấy API Key

**Cấu hình .env:**
```bash
# Casso Configuration
CASSO_API_URL=https://oauth.casso.vn/v2
CASSO_API_KEY=your_casso_api_key
CASSO_WEBHOOK_SECRET=your_casso_webhook_secret
BANK_WEBHOOK_SECRET=your_casso_webhook_secret
```

### 3. **VietQR Gateway** (Backup)

**Cách sử dụng:**
- Dành cho các gateway khác hỗ trợ VietQR standard
- Format webhook tùy theo từng nhà cung cấp

## ⚙️ Cấu hình hệ thống

### 1. **Cập nhật file .env**

```bash
# MB Bank Configuration
VIETQR_BANK_CODE=MB
VIETQR_ACCOUNT_NUMBER=0346176591
VIETQR_ACCOUNT_NAME=VO TAN THINH

# Gateway Configuration (chọn 1 trong các gateway trên)
SEPAY_TOKEN=your_sepay_token
BANK_WEBHOOK_SECRET=your_webhook_secret

# Server Configuration
VERBOSE=true
ENABLE_PAYMENT_DETECTION=true
WEBHOOK_BASE_URL=https://your-domain.com/api/qr-payment
```

### 2. **Restart server để áp dụng config mới**

```bash
npm run dev
# hoặc
npm start
```

### 3. **Kiểm tra endpoints hoạt động**

- Webhook endpoint: `POST /api/qr-payment/webhook/bank`
- Create QR: `POST /api/qr-payment/bank/:orderId`
- Check status: `GET /api/qr-payment/status/:transactionId`
- Manual verify (admin): `POST /api/qr-payment/admin/verify/:transactionId`

## 🧪 Cách test webhook

### 1. **Test với Postman/curl**

```bash
curl -X POST http://localhost:3001/api/qr-payment/webhook/bank \
  -H "Content-Type: application/json" \
  -H "x-signature: your_webhook_secret" \
  -d '{
    "type": "transfer",
    "data": {
      "tid": "TEST123",
      "amount": 150000,
      "description": "Thanh toan don hang 12345 | Ma: 9A7B23",
      "accountNumber": "0346176591",
      "accountBankCode": "MB"
    }
  }'
```

### 2. **Test với ngrok (cho webhook thực)**

```bash
# Cài ngrok
npm install -g ngrok

# Expose local server
ngrok http 3001

# Sử dụng URL ngrok làm webhook URL
# Ví dụ: https://abc123.ngrok.io/api/qr-payment/webhook/bank
```

### 3. **Kiểm tra log**

```bash
# Server sẽ log chi tiết quá trình xử lý webhook
tail -f logs/server.log

# Hoặc xem console output nếu chạy npm run dev
```

## 🔄 Luồng hoạt động hoàn chỉnh

1. **Tạo QR Code:**
   ```
   POST /api/qr-payment/bank/123
   → Tạo QR VietQR MB Bank với mã xác minh
   → Lưu transaction vào DB với trạng thái 'cho_xac_nhan'
   → Trả về QR code cho frontend
   ```

2. **Khách hàng thanh toán:**
   ```
   Khách quét QR → Chuyển khoản MB Bank
   → Gateway phát hiện giao dịch → Gửi webhook
   ```

3. **Xử lý webhook:**
   ```
   POST /webhook/bank
   → Verify signature
   → Parse payload
   → Tìm transaction matching
   → Cập nhật DB: 'da_xac_nhan'
   → Emit Socket.IO: 'payment-success'
   ```

4. **Frontend nhận thông báo:**
   ```javascript
   socket.on('payment-success', (data) => {
     alert('Thanh toán thành công!');
     window.location.href = '/success';
   });
   ```

## 🛡️ Security Notes

- **Luôn verify webhook signature** để đảm bảo request từ gateway thật
- **Sử dụng HTTPS** cho production webhook URL
- **Rate limiting** cho webhook endpoint
- **Log chi tiết** để debug và audit
- **Backup manual verify** cho trường hợp webhook fail

## 🚨 Troubleshooting

### Webhook không hoạt động:
1. Kiểm tra BANK_WEBHOOK_SECRET trong .env
2. Verify webhook URL accessible từ internet
3. Check gateway dashboard có đúng webhook URL
4. Xem server logs để debug

### Transaction không match:
1. Kiểm tra verification code có trong nội dung chuyển khoản
2. Verify số tiền khớp (cho phép chênh lệch < 1000 VND)
3. Check transaction chưa hết hạn
4. Xem table giao_dich_ngan_hang trong DB

### Socket.IO không emit:
1. Kiểm tra global.io được khởi tạo
2. Verify client đã join room theo transactionId
3. Check firewall không block WebSocket

## 📞 Support

Nếu gặp vấn đề, check:
1. Server logs: `console.log` trong webhook handler
2. Database: table `giao_dich_ngan_hang`
3. Gateway dashboard: webhook delivery status
4. Network: webhook URL accessible từ external

---

✅ **Khi hoàn tất setup, hệ thống sẽ tự động:**
- Tạo QR MB Bank với mã xác minh unique
- Nhận webhook khi có chuyển khoản
- Match giao dịch dựa trên mã xác minh + số tiền
- Cập nhật trạng thái database
- Thông báo real-time cho frontend qua Socket.IO
- Hiển thị "Thanh toán thành công" ngay lập tức!