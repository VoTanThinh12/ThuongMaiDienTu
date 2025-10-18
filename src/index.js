require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const cors = require('cors');

// Control logging verbosity: opt-in only via VERBOSE=true
const isVerbose = process.env.VERBOSE === 'true';
// Silence console noise globally if not verbose (keep errors and warnings)
if (!isVerbose) {
  console.log = () => {};
  console.debug = () => {};
  console.trace = () => {};
  // keep console.warn and console.error for important issues
}

const nhanvienRoutes = require('./routes/nhanvien.routes.js');
const sanPhamRoutes = require('./routes/sanpham.routes.js');
const phieuNhapRoutes = require('./routes/phieunhap.routes.js');
const authRoutes = require('./routes/auth.routes.js');
const baocaoRoutes = require('./routes/baocao.routes.js');
const hoadonbanRoutes = require('./routes/hoadonban.routes.js');
const userRoutes = require('./routes/user.routes.js');
const dashboardRoutes = require('./routes/dashboard.routes.js'); 
const customerRoutes = require('./routes/customer.routes');
const addressRoutes = require('./routes/address.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const storefrontRoutes = require('./routes/storefront.routes');
const paymentRoutes = require('./routes/payment.routes');
const qrPaymentRoutes = require('./routes/qrPayment.routes');
const voucherRoutes = require('./routes/voucher.routes');
// Đã loại bỏ import các route phát hiện/xác nhận chuyển khoản ngân hàng

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(require('path').join(process.cwd(), 'uploads')));

app.get('/', (req, res) => {
  res.json({
    message: 'Chào mừng đến với API quản lý cửa hàng tiện lợi!',
    endpoints: [
      { path: '/api/nhanvien', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
      { path: '/api/sanpham', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
      { path: '/api/phieunhap/tao', methods: ['POST'] },
      { path: '/api/auth/login', methods: ['POST'] },
      { path: '/api/auth/register', methods: ['POST'] },
      { path: '/api/dashboard/summary', methods: ['GET'] },
      // Storefront (public)
      { path: '/api/storefront/products', methods: ['GET'] },
      { path: '/api/storefront/products/:id', methods: ['GET'] },
      // Customer auth/profile
      { path: '/api/customer/register', methods: ['POST'] },
      { path: '/api/customer/login', methods: ['POST'] },
      { path: '/api/customer/profile', methods: ['GET', 'PUT'] },
      // Address (customer)
      { path: '/api/address', methods: ['GET', 'POST', 'DELETE'] },
      { path: '/api/address/:id', methods: ['PUT', 'DELETE'] },
      // Cart (customer)
      { path: '/api/cart', methods: ['GET', 'DELETE'] },
      { path: '/api/cart/add', methods: ['POST'] },
      { path: '/api/cart/:id', methods: ['PUT', 'DELETE'] },
      // Orders (customer + admin)
      { path: '/api/order', methods: ['POST'] },
      { path: '/api/order/my-orders', methods: ['GET'] },
      { path: '/api/order/:id', methods: ['GET'] },
      { path: '/api/order/:id/cancel', methods: ['PUT'] },
      { path: '/api/order/admin/all', methods: ['GET'] },
      { path: '/api/order/admin/:id/status', methods: ['PUT'] },
      // Payments
      { path: '/api/payment/vnpay/create-customer/:id', methods: ['GET'] },
      { path: '/api/payment/vnpay/return', methods: ['GET'] },
      { path: '/api/payment/momo/create-customer/:id', methods: ['GET'] },
      { path: '/api/payment/momo/ipn', methods: ['POST'] },
      { path: '/api/payment/momo/return', methods: ['GET'] },
      // QR Payments
      { path: '/api/qr-payment/bank/:id', methods: ['POST'] },
      { path: '/api/qr-payment/momo/:id', methods: ['POST'] },
      { path: '/api/qr-payment/status/:transactionId', methods: ['GET'] },
      { path: '/api/qr-payment/cancel/:transactionId', methods: ['DELETE'] },
      { path: '/api/qr-payment/webhook/momo', methods: ['POST'] },
      // Vouchers
      { path: '/api/voucher', methods: ['GET', 'POST'] },
      { path: '/api/voucher/code/:ma_voucher', methods: ['GET'] },
      { path: '/api/voucher/apply', methods: ['POST'] },
      { path: '/api/voucher/:id', methods: ['PUT', 'DELETE'] },
      { path: '/api/voucher/stats', methods: ['GET'] }
    ],
  });
});

app.use('/api/nhanvien', nhanvienRoutes);
app.use('/api/sanpham', sanPhamRoutes);
app.use('/api/phieunhap', phieuNhapRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/baocao', baocaoRoutes);
app.use('/api/hoadonban', hoadonbanRoutes);
app.use('/api/user', userRoutes);
app.use('/api/dashboard', dashboardRoutes); 
app.use('/api/customer', customerRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/storefront', storefrontRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/qr-payment', qrPaymentRoutes);
app.use('/api/voucher', voucherRoutes);
// Tắt toàn bộ các route xác nhận/phát hiện chuyển khoản ngân hàng để chỉ giữ phần tạo QR
// app.use('/api/bank-transactions', bankTransactionRoutes);
// app.use('/api/auto-payment-detection', autoPaymentDetectionRoutes);
// app.use('/api/ultra-accurate-payment-detection', ultraAccuratePaymentDetectionRoutes);
// app.use('/api/simple-bank-payment-detection', simpleBankPaymentDetectionRoutes);
// app.use('/api/fully-auto-payment-detection', fullyAutoPaymentDetectionRoutes);
// app.use('/api/secure-payment-detection', securePaymentDetectionRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  if (isVerbose) console.log('Client connected:', socket.id);

  // Join room for specific transaction
  socket.on('join-transaction', (transactionId) => {
    socket.join(`transaction-${transactionId}`);
    if (isVerbose) console.log(`Client ${socket.id} joined transaction ${transactionId}`);
  });

  // Leave transaction room
  socket.on('leave-transaction', (transactionId) => {
    socket.leave(`transaction-${transactionId}`);
    if (isVerbose) console.log(`Client ${socket.id} left transaction ${transactionId}`);
  });

  socket.on('disconnect', () => {
    if (isVerbose) console.log('Client disconnected:', socket.id);
  });
});

// Make io available globally for other modules
global.io = io;

// Start background detection services only when explicitly enabled
const enableDetection = process.env.ENABLE_PAYMENT_DETECTION === 'true';
if (enableDetection) {
  try { require('./services/paymentStatusChecker.service'); } catch (_) {}
  try { require('./services/realPaymentVerification.service'); } catch (_) {}
  try { require('./services/realBankingDetection.service'); } catch (_) {}
}

// Xử lý lỗi port đã được sử dụng
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    if (isVerbose) console.log('❌ Port 3001 đã được sử dụng. Đang thử port khác...');
    server.listen(3002, () => {
      if (isVerbose) console.log('Server chạy tại http://localhost:3002');
      if (isVerbose) console.log('Socket.IO server đã sẵn sàng');
      if (isVerbose) console.log('🚀 Auto Payment Detection Service đã được khởi động');
    });
  } else {
    console.error('❌ Lỗi server:', err);
  }
});

server.listen(3001, () => {
  if (isVerbose) console.log('Server chạy tại http://localhost:3001');
  if (isVerbose) console.log('Socket.IO server đã sẵn sàng');
  if (isVerbose) console.log('🚀 Auto Payment Detection Service đã được khởi động');
});
