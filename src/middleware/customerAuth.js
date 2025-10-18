const jwt = require('jsonwebtoken');

const customerAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập' });
    }

    const [scheme, token] = String(authHeader).split(' ');
    if (!token || scheme.toLowerCase() !== 'bearer') {
      return res.status(401).json({ error: 'Token không hợp lệ' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Token hết hạn hoặc không hợp lệ' });
    }

    if (!decoded || decoded.type !== 'customer' || !decoded.id) {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
    }

    req.customerId = decoded.id;
    return next();
  } catch (error) {
    console.error('Customer auth error:', error);
    // Đảm bảo không rò rỉ lỗi 500 cho lỗi xác thực
    return res.status(401).json({ error: 'Xác thực thất bại' });
  }
};

module.exports = customerAuth;