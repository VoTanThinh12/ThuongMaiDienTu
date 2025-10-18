// validation/product.validation.js
const Joi = require('joi');

exports.sanPhamSchema = Joi.object({
    ten_san_pham: Joi.string().max(100).required().messages({
        'string.empty': 'Tên sản phẩm không được để trống',
        'string.max': 'Tên sản phẩm không được vượt quá 100 ký tự',
    }),
    ma_san_pham: Joi.string().max(50).required().messages({
        'string.empty': 'Mã sản phẩm không được để trống',
        'string.max': 'Mã sản phẩm không được vượt quá 50 ký tự',
    }),
    don_vi_tinh: Joi.string().max(50).required().messages({
        'string.empty': 'Đơn vị tính không được để trống',
        'string.max': 'Đơn vị tính không được vượt quá 50 ký tự',
    }),
    gia_ban: Joi.number().positive().required().messages({
        'number.base': 'Giá bán phải là số',
        'number.positive': 'Giá bán phải lớn hơn 0',
    }),
    so_luong: Joi.number().integer().min(0).required().messages({
        'number.base': 'Số lượng phải là số nguyên',
        'number.min': 'Số lượng không được âm',
    }),
});