const crypto = require('crypto');
const qs = require('qs');

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

exports.buildPaymentUrl = ({
  amount,
  orderId,
  orderInfo,
  ipAddr,
}) => {
  const vnp_TmnCode = process.env.VNP_TMN_CODE;
  const vnp_HashSecret = process.env.VNP_HASH_SECRET;
  const vnp_Url = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  const vnp_ReturnUrl = process.env.VNP_RETURN_URL;

  const createDate = new Date();
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const yyyy = createDate.getFullYear();
  const MM = pad(createDate.getMonth() + 1);
  const dd = pad(createDate.getDate());
  const hh = pad(createDate.getHours());
  const mm = pad(createDate.getMinutes());
  const ss = pad(createDate.getSeconds());
  const vnp_CreateDate = `${yyyy}${MM}${dd}${hh}${mm}${ss}`;

  const inputData = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: vnp_TmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: Math.round(Number(amount) * 100).toString(),
    vnp_ReturnUrl: vnp_ReturnUrl,
    vnp_IpAddr: ipAddr || '0.0.0.0',
    vnp_CreateDate,
  };

  const sorted = sortObject(inputData);
  const signData = qs.stringify(sorted, { encode: false });
  const hmac = crypto.createHmac('sha512', vnp_HashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  const query = qs.stringify({ ...sorted, vnp_SecureHash: signed }, { encode: false });
  return `${vnp_Url}?${query}`;
};

exports.verifyReturn = (params) => {
  const vnp_HashSecret = process.env.VNP_HASH_SECRET;

  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = params;
  const sorted = sortObject(rest);
  const signData = qs.stringify(sorted, { encode: false });
  const hmac = crypto.createHmac('sha512', vnp_HashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  return signed === vnp_SecureHash;
};


