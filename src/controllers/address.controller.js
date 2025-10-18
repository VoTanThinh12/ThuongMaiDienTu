// controllers/address.controller.js
const addressService = require('../services/address.service');
const Joi = require('joi');

// Xử lý lỗi chung
const handleServiceError = (res, error) => {
    if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Address error:', error);
    res.status(500).json({ error: 'Lỗi server khi xử lý địa chỉ' });
};

// GET /addresses
exports.getAddresses = async (req, res) => {
    try {
        const addresses = await addressService.getAllAddresses(req.customerId);
        res.json(addresses);
    } catch (error) {
        handleServiceError(res, error);
    }
};

// POST /addresses
exports.createAddress = async (req, res) => {
    try {
        const schema = Joi.object({
            ho_ten_nguoi_nhan: Joi.string().max(100).required(),
            so_dien_thoai: Joi.string().pattern(/^[0-9]{10,11}$/).required(),
            dia_chi_chi_tiet: Joi.string().required(),
            phuong_xa: Joi.string().allow('', null),
            quan_huyen: Joi.string().allow('', null),
            tinh_thanh: Joi.string().allow('', null),
            mac_dinh: Joi.boolean().optional()
        });
        const { error, value } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ errors: error.details.map(e => e.message) });
        }

        const newAddress = await addressService.createAddress(req.customerId, value);
        res.status(201).json({ message: 'Thêm địa chỉ thành công', address: newAddress });
    } catch (error) {
        handleServiceError(res, error);
    }
};

// PUT /addresses/:id
exports.updateAddress = async (req, res) => {
    try {
        const schema = Joi.object({
            ho_ten_nguoi_nhan: Joi.string().max(100).optional(),
            so_dien_thoai: Joi.string().pattern(/^[0-9]{10,11}$/).optional(),
            dia_chi_chi_tiet: Joi.string().optional(),
            phuong_xa: Joi.string().allow('', null),
            quan_huyen: Joi.string().allow('', null),
            tinh_thanh: Joi.string().allow('', null),
            mac_dinh: Joi.boolean().optional()
        });
        const { error, value } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ errors: error.details.map(e => e.message) });
        }

        const updatedAddress = await addressService.updateAddress(
            req.params.id,
            req.customerId,
            value
        );
        res.json({ message: 'Cập nhật địa chỉ thành công', address: updatedAddress });
    } catch (error) {
        handleServiceError(res, error);
    }
};

// DELETE /addresses/:id
exports.deleteAddress = async (req, res) => {
    try {
        await addressService.deleteAddress(req.params.id, req.customerId);
        res.json({ message: 'Xóa địa chỉ thành công' });
    } catch (error) {
        handleServiceError(res, error);
    }
};