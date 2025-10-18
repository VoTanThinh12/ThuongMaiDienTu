const Joi = require('joi');

// Schema đăng ký khách hàng
const registerSchema = Joi.object({
  ho_ten: Joi.string().required().messages({
    'string.empty': 'Họ tên không được để trống'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'string.empty': 'Email không được để trống'
  }),
  so_dien_thoai: Joi.string().pattern(/^[0-9]{10,11}$/).required().messages({
    'string.pattern.base': 'Số điện thoại phải có 10-11 chữ số',
    'string.empty': 'Số điện thoại không được để trống'
  }),
  mat_khau: Joi.string().min(6).required().messages({
    'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
    'string.empty': 'Mật khẩu không được để trống'
  })
});

// Schema đăng nhập khách hàng
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'string.empty': 'Email không được để trống'
  }),
  mat_khau: Joi.string().required().messages({
    'string.empty': 'Mật khẩu không được để trống'
  })
});

module.exports = { registerSchema, loginSchema };



