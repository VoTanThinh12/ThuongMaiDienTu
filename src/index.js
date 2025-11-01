require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const cors = require('cors');

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

const io = socketIo(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST']
  }
});

// Control logging verbosity
const isVerbose = process.env.VERBOSE === 'true';
if (!isVerbose) {
  console.log = () => {};
  console.debug = () => {};
  console.trace = () => {};
}

// routes ...
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

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());
app.use('/uploads', express.static(require('path').join(process.cwd(), 'uploads')));

app.get('/', (req, res) => { res.json({ message: 'API OK' }); });

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

io.on('connection', (socket) => {
  if (isVerbose) console.log('Client connected:', socket.id);
  socket.on('join-transaction', (transactionId) => {
    socket.join(`transaction-${transactionId}`);
  });
  socket.on('leave-transaction', (transactionId) => {
    socket.leave(`transaction-${transactionId}`);
  });
});

global.io = io;

const enableDetection = process.env.ENABLE_PAYMENT_DETECTION === 'true' && process.env.NODE_ENV === 'development';
if (enableDetection) {
  try { require('./services/paymentStatusChecker.service'); } catch (_) {}
  try { require('./services/realPaymentVerification.service'); } catch (_) {}
  try { require('./services/realBankingDetection.service'); } catch (_) {}
}

server.listen(process.env.PORT || 3001, () => {
  if (isVerbose) console.log(`Server running at http://localhost:${process.env.PORT || 3001}`);
});
