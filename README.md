# Hệ Thống Quản Lý Cửa Hàng Tiện Lợi

Dự án backend cho hệ thống quản lý cửa hàng tiện lợi với đầy đủ tính năng quản lý sản phẩm, đơn hàng, thanh toán và báo cáo.

## 🚀 Tính Năng Chính

### 📦 Quản Lý Sản Phẩm
- Thêm, sửa, xóa sản phẩm
- Quản lý danh mục sản phẩm
- Upload và quản lý hình ảnh sản phẩm
- Theo dõi tồn kho

### 🛒 Quản Lý Đơn Hàng
- Tạo đơn hàng mới
- Xử lý giỏ hàng
- Theo dõi trạng thái đơn hàng
- Quản lý giao hàng

### 💳 Hệ Thống Thanh Toán
- Thanh toán bằng QR Code
- Tích hợp MoMo và VNPay
- Phát hiện thanh toán tự động từ ngân hàng
- Quản lý giao dịch ngân hàng

### 👥 Quản Lý Người Dùng
- Hệ thống đăng nhập/đăng ký
- Phân quyền người dùng (Admin, Thu ngân, Nhân viên kho)
- Quản lý khách hàng

### 📊 Báo Cáo & Thống Kê
- Báo cáo doanh thu
- Thống kê sản phẩm bán chạy
- Báo cáo tồn kho
- Dashboard tổng quan

## 🛠️ Công Nghệ Sử Dụng

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL với Prisma ORM
- **Authentication**: JWT
- **Payment**: MoMo, VNPay, QR Code
- **File Upload**: Multer
- **Validation**: Joi

## 📁 Cấu Trúc Dự Án

```
backend/
├── src/
│   ├── controllers/     # Xử lý logic nghiệp vụ
│   ├── routes/          # Định nghĩa API routes
│   ├── services/        # Các service hỗ trợ
│   ├── middleware/      # Middleware xử lý request
│   ├── validation/      # Validation schemas
│   ├── utils/           # Utilities và helpers
│   └── data/            # Dữ liệu seed
├── prisma/              # Database schema và migrations
├── customer-app/        # Frontend cho khách hàng
├── admin-app/          # Frontend cho admin
└── quanly-cuahang/     # Frontend quản lý cửa hàng
```

## 🚀 Cài Đặt & Chạy Dự Án

### Yêu Cầu Hệ Thống
- Node.js >= 16.x
- PostgreSQL >= 13.x
- npm hoặc yarn

### Cài Đặt Dependencies
```bash
npm install
```

### Cấu Hình Database
1. Tạo database PostgreSQL
2. Cập nhật connection string trong `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

### Chạy Migrations
```bash
npx prisma migrate dev
```

### Seed Dữ Liệu Mẫu
```bash
npm run seed
```

### Chạy Server
```bash
npm start
# hoặc
npm run dev  # cho development
```

## 🔧 Scripts Có Sẵn

- `npm start` - Chạy server production
- `npm run dev` - Chạy server development với nodemon
- `npm run seed` - Chạy seed dữ liệu mẫu
- `npm run build` - Build dự án
- `npm test` - Chạy tests

## 📚 API Documentation

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/logout` - Đăng xuất

### Products
- `GET /api/products` - Lấy danh sách sản phẩm
- `POST /api/products` - Tạo sản phẩm mới
- `PUT /api/products/:id` - Cập nhật sản phẩm
- `DELETE /api/products/:id` - Xóa sản phẩm

### Orders
- `GET /api/orders` - Lấy danh sách đơn hàng
- `POST /api/orders` - Tạo đơn hàng mới
- `PUT /api/orders/:id` - Cập nhật đơn hàng

### Payments
- `POST /api/payments/qr` - Tạo QR thanh toán
- `POST /api/payments/momo` - Thanh toán MoMo
- `POST /api/payments/vnpay` - Thanh toán VNPay

## 🔐 Environment Variables

Tạo file `.env` với các biến sau:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# JWT
JWT_SECRET="your_jwt_secret_key"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV=development

# Payment APIs
MOMO_PARTNER_CODE="your_momo_partner_code"
MOMO_ACCESS_KEY="your_momo_access_key"
MOMO_SECRET_KEY="your_momo_secret_key"

VNPAY_TMN_CODE="your_vnpay_tmn_code"
VNPAY_SECRET_KEY="your_vnpay_secret_key"

# Upload
UPLOAD_PATH="./uploads"
MAX_FILE_SIZE=5242880
```

## 🤝 Đóng Góp

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📄 License

Dự án này được phân phối dưới MIT License. Xem file `LICENSE` để biết thêm chi tiết.

## 👥 Tác Giả

- **Võ Tấn Thịnh** - [@VoTanThinh12](https://github.com/VoTanThinh12)

## 📞 Liên Hệ

Nếu có câu hỏi hoặc góp ý, vui lòng tạo issue trên GitHub repository này.
