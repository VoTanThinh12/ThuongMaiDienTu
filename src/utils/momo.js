const crypto = require('crypto');
const axios = require('axios');

exports.createMoMoPayment = async ({ amount, orderId, orderInfo, ipnUrl, redirectUrl }) => {
  const partnerCode = process.env.MOMO_PARTNER_CODE;
  const accessKey = process.env.MOMO_ACCESS_KEY;
  const secretKey = process.env.MOMO_SECRET_KEY;
  const endpoint = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';

  const requestId = `${orderId}-${Date.now()}`;
  const orderInfoText = orderInfo || `Thanh toan don hang ${orderId}`;
  const requestBody = {
    partnerCode,
    accessKey,
    requestId,
    amount: String(Math.round(Number(amount))),
    orderId,
    orderInfo: orderInfoText,
    redirectUrl,
    ipnUrl,
    requestType: 'captureWallet'
  };

  const rawSignature = `accessKey=${accessKey}&amount=${requestBody.amount}&extraData=&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfoText}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestBody.requestType}`;
  const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');
  requestBody.signature = signature;
  requestBody.extraData = '';

  const { data } = await axios.post(endpoint, requestBody, { headers: { 'Content-Type': 'application/json' } });
  return data; // contains payUrl, deeplink, etc.
};

exports.verifyMoMoSignature = (params) => {
  const secretKey = process.env.MOMO_SECRET_KEY;
  const {
    partnerCode, orderId, requestId, amount, orderInfo, orderType, transId,
    resultCode, message, payType, responseTime, extraData, signature
  } = params;

  const raw = `amount=${amount}&extraData=${extraData || ''}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
  const expected = crypto.createHmac('sha256', secretKey).update(raw).digest('hex');
  return expected === signature;
};




