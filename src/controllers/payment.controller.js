const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { buildPaymentUrl, verifyReturn } = require('../utils/vnpay');
const { createMoMoPayment, verifyMoMoSignature } = require('../utils/momo');
const CustomError = require('../services/CustomError');
let stripe = null;
try {
  // Optional require to avoid crash if stripe not installed yet
  // eslint-disable-next-line global-require
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });
} catch (e) {
  stripe = null;
}

// Tạo URL thanh toán VNPay cho một đơn hàng chưa thanh toán
exports.createVnpayPayment = async (req, res) => {
  try {
    const { id } = req.params; // order id

    const order = await prisma.don_hang.findUnique({ where: { id: Number(id) } });
    if (!order) throw new CustomError('Không tìm thấy đơn hàng', 404);
    if (order.trang_thai !== 'cho_xac_nhan') throw new CustomError('Đơn hàng không hợp lệ để thanh toán', 400);
    if (order.trang_thai_thanh_toan) throw new CustomError('Đơn hàng đã thanh toán', 400);

    const paymentUrl = buildPaymentUrl({
      amount: order.tong_tien,
      orderId: order.ma_don_hang,
      orderInfo: `Thanh toan don hang ${order.ma_don_hang}`,
      ipAddr: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
    });

    res.json({ url: paymentUrl });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error('VNPay create url error:', error);
    res.status(500).json({ error: 'Lỗi tạo URL thanh toán' });
  }
};

// Tạo URL VNPay cho khách hàng (kiểm tra quyền sở hữu đơn hàng)
exports.createVnpayPaymentCustomer = async (req, res) => {
  try {
    const { id } = req.params; // order id

    const order = await prisma.don_hang.findUnique({ where: { id: Number(id) } });
    if (!order) throw new CustomError('Không tìm thấy đơn hàng', 404);
    if (order.id_khach_hang !== req.customerId) throw new CustomError('Không có quyền với đơn hàng này', 403);
    if (order.trang_thai !== 'cho_xac_nhan') throw new CustomError('Đơn hàng không hợp lệ để thanh toán', 400);
    if (order.trang_thai_thanh_toan) throw new CustomError('Đơn hàng đã thanh toán', 400);

    const paymentUrl = buildPaymentUrl({
      amount: order.tong_tien,
      orderId: order.ma_don_hang,
      orderInfo: `Thanh toan don hang ${order.ma_don_hang}`,
      ipAddr: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
    });

    res.json({ url: paymentUrl });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error('VNPay create url (customer) error:', error);
    res.status(500).json({ error: 'Lỗi tạo URL thanh toán' });
  }
};

// Callback/Return URL từ VNPay
exports.vnpayReturn = async (req, res) => {
  try {
    const params = req.query;
    const isValid = verifyReturn(params);
    if (!isValid) throw new CustomError('Chữ ký không hợp lệ', 400);

    const transactionStatus = params.vnp_TransactionStatus; // '00' là thành công
    const orderCode = params.vnp_TxnRef; // chính là ma_don_hang

    const order = await prisma.don_hang.findFirst({ where: { ma_don_hang: orderCode } });
    if (!order) throw new CustomError('Không tìm thấy đơn hàng', 404);

    if (transactionStatus === '00') {
      await prisma.don_hang.update({
        where: { id: order.id },
        data: { trang_thai_thanh_toan: true, trang_thai: 'da_xac_nhan' }
      });
      return res.json({ success: true, message: 'Thanh toán thành công' });
    }

    return res.json({ success: false, message: 'Thanh toán thất bại hoặc bị hủy' });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error('VNPay return error:', error);
    res.status(500).json({ error: 'Lỗi xử lý kết quả thanh toán' });
  }
};

// MoMo: tạo link thanh toán
exports.createMomoPayment = async (req, res) => {
  try {
    const { id } = req.params; // order id
    const order = await prisma.don_hang.findUnique({ where: { id: Number(id) } });
    if (!order) throw new CustomError('Không tìm thấy đơn hàng', 404);
    if (order.trang_thai !== 'cho_xac_nhan') throw new CustomError('Đơn hàng không hợp lệ để thanh toán', 400);
    if (order.trang_thai_thanh_toan) throw new CustomError('Đơn hàng đã thanh toán', 400);

    const data = await createMoMoPayment({
      amount: order.tong_tien,
      orderId: order.ma_don_hang,
      orderInfo: `Thanh toan don hang ${order.ma_don_hang}`,
      redirectUrl: process.env.MOMO_RETURN_URL,
      ipnUrl: process.env.MOMO_IPN_URL,
    });
    res.json(data);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error('MoMo create error:', error);
    res.status(500).json({ error: 'Lỗi tạo thanh toán MoMo' });
  }
};

// MoMo IPN (server to server)
exports.momoIpn = async (req, res) => {
  try {
    const params = req.body;
    const valid = verifyMoMoSignature(params);
    if (!valid) return res.status(400).json({ message: 'invalid signature' });

    const { orderId, resultCode } = params;
    const order = await prisma.don_hang.findFirst({ where: { ma_don_hang: orderId } });
    if (!order) return res.status(404).json({ message: 'order not found' });

    // Chỉ cập nhật nếu đơn vẫn còn ở trạng thái chờ xác nhận và chưa bị hủy
    if (Number(resultCode) === 0 && order.trang_thai === 'cho_xac_nhan') {
      await prisma.don_hang.update({
        where: { id: order.id },
        data: { trang_thai_thanh_toan: true, trang_thai: 'da_xac_nhan' }
      });
    }
    res.json({ message: 'ok' });
  } catch (error) {
    console.error('MoMo IPN error:', error);
    res.status(500).json({ message: 'internal error' });
  }
};

// MoMo return (trình duyệt user)
exports.momoReturn = async (req, res) => {
  try {
    // Có thể xác minh signature ở đây nếu cần (params trên query)
    const { orderId, resultCode } = req.query;
    const order = await prisma.don_hang.findFirst({ where: { ma_don_hang: orderId } });
    if (!order) return res.status(404).send('order not found');
    if (Number(resultCode) === 0) {
      await prisma.don_hang.update({
        where: { id: order.id },
        data: { trang_thai_thanh_toan: true, trang_thai: 'da_xac_nhan' }
      });
      return res.send('Thanh toán MoMo thành công');
    }
    res.send('Thanh toán MoMo thất bại hoặc bị hủy');
  } catch (error) {
    console.error('MoMo return error:', error);
    res.status(500).send('Internal error');
  }
};

// MoMo: khách hàng tự tạo link (kiểm tra quyền sở hữu đơn)
exports.createMomoPaymentCustomer = async (req, res) => {
  try {
    const { id } = req.params; // order id
    const order = await prisma.don_hang.findUnique({ where: { id: Number(id) } });
    if (!order) throw new CustomError('Không tìm thấy đơn hàng', 404);
    if (order.id_khach_hang !== req.customerId) throw new CustomError('Không có quyền với đơn hàng này', 403);
    if (order.trang_thai !== 'cho_xac_nhan') throw new CustomError('Đơn hàng không hợp lệ để thanh toán', 400);
    if (order.trang_thai_thanh_toan) throw new CustomError('Đơn hàng đã thanh toán', 400);

    const data = await createMoMoPayment({
      amount: order.tong_tien,
      orderId: order.ma_don_hang,
      orderInfo: `Thanh toan don hang ${order.ma_don_hang}`,
      redirectUrl: process.env.MOMO_RETURN_URL,
      ipnUrl: process.env.MOMO_IPN_URL,
    });
    res.json(data);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error('MoMo create (customer) error:', error);
    res.status(500).json({ error: 'Lỗi tạo thanh toán MoMo' });
  }
};


// Public payment config for frontend (bank transfer info, supported methods)
exports.getPublicConfig = async (req, res) => {
  try {
    const config = {
      methods: ['cod', 'bank_transfer', 'vnpay', 'momo'],
      bank: {
        vietqrBankCode: process.env.VIETQR_BANK || '', // e.g. VCB
        bankName: process.env.VIETQR_BANK_NAME || '', // e.g. Vietcombank
        accountNumber: process.env.VIETQR_ACCOUNT_NUMBER || '',
        accountName: process.env.VIETQR_ACCOUNT_NAME || '',
        branch: process.env.VIETQR_BRANCH || '',
      },
    };
    res.json(config);
  } catch (error) {
    console.error('Payment config error:', error);
    res.status(500).json({ error: 'Không tải được cấu hình thanh toán' });
  }
};

// Stripe: tạo Checkout Session cho khách hàng
exports.createStripePaymentCustomer = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(501).json({ error: 'Stripe chưa được cấu hình trên server' });
    }
    const { id } = req.params; // order id
    const order = await prisma.don_hang.findUnique({ where: { id: Number(id) } });
    if (!order) throw new CustomError('Không tìm thấy đơn hàng', 404);
    if (order.id_khach_hang !== req.customerId) throw new CustomError('Không có quyền với đơn hàng này', 403);
    if (order.trang_thai !== 'cho_xac_nhan') throw new CustomError('Đơn hàng không hợp lệ để thanh toán', 400);
    if (order.trang_thai_thanh_toan) throw new CustomError('Đơn hàng đã thanh toán', 400);

    const successUrl = process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/orders/' + id + '?paid=1';
    const cancelUrl = process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/orders/' + id + '?cancel=1';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'vnd',
            product_data: { name: `Đơn hàng ${order.ma_don_hang}` },
            unit_amount: Math.round(Number(order.tong_tien) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { orderId: String(order.id), orderCode: order.ma_don_hang },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.json({ url: session.url });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error('Stripe create error:', error);
    res.status(500).json({ error: 'Lỗi tạo thanh toán Stripe' });
  }
};

// Stripe webhook: cập nhật đơn sau khi thanh toán thành công
exports.stripeWebhook = async (req, res) => {
  try {
    if (!stripe) return res.status(501).send('stripe not configured');
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Stripe webhook signature failed', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = Number(session.metadata?.orderId);
      if (orderId) {
        await prisma.don_hang.update({
          where: { id: orderId },
          data: { trang_thai_thanh_toan: true, trang_thai: 'da_xac_nhan' }
        });
      }
    }
    res.json({ received: true });
  } catch (e) {
    console.error('Stripe webhook error', e);
    res.status(500).send('internal error');
  }
};

// PayPal: tạo order và trả link approve
exports.createPaypalOrderCustomer = async (req, res) => {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;
    if (!clientId || !secret) return res.status(501).json({ error: 'PayPal chưa cấu hình' });
    const { id } = req.params; // order id
    const order = await prisma.don_hang.findUnique({ where: { id: Number(id) } });
    if (!order) throw new CustomError('Không tìm thấy đơn hàng', 404);
    if (order.id_khach_hang !== req.customerId) throw new CustomError('Không có quyền với đơn hàng này', 403);
    if (order.trang_thai !== 'cho_xac_nhan') throw new CustomError('Đơn hàng không hợp lệ để thanh toán', 400);
    if (order.trang_thai_thanh_toan) throw new CustomError('Đơn hàng đã thanh toán', 400);

    // get access token
    const basicAuth = Buffer.from(`${clientId}:${secret}`).toString('base64');
    const tokenResp = await fetch((process.env.PAYPAL_BASE || 'https://api-m.sandbox.paypal.com') + '/v1/oauth2/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials'
    });
    const tokenJson = await tokenResp.json();
    const accessToken = tokenJson.access_token;

    const successUrl = process.env.PAYPAL_SUCCESS_URL || 'http://localhost:3000/orders/' + id + '?paid=1';
    const cancelUrl = process.env.PAYPAL_CANCEL_URL || 'http://localhost:3000/orders/' + id + '?cancel=1';

    // create order
    const createResp = await fetch((process.env.PAYPAL_BASE || 'https://api-m.sandbox.paypal.com') + '/v2/checkout/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: String(order.id),
            amount: { currency_code: 'USD', value: String((Number(order.tong_tien) / 24000).toFixed(2)) }
          }
        ],
        application_context: { return_url: successUrl, cancel_url: cancelUrl }
      })
    });
    const orderJson = await createResp.json();
    const approveLink = orderJson.links?.find((l) => l.rel === 'approve')?.href;
    if (!approveLink) return res.status(500).json({ error: 'Không tạo được link PayPal' });
    res.json({ url: approveLink });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error('PayPal create error:', error);
    res.status(500).json({ error: 'Lỗi tạo thanh toán PayPal' });
  }
};

