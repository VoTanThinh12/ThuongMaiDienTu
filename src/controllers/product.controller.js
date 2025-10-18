// controllers/product.controller.js
const productService = require('../services/product.service');
const { sanPhamSchema } = require('../validation/product.validation'); // <-- IMPORT SCHEMA
// Hàm xử lý lỗi chung
const handleServiceError = (res, error) => {
    if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Product Admin error:', error);
    res.status(500).json({ error: 'Lỗi server khi quản lý sản phẩm' });
};


// GET: Danh sách sản phẩm (Admin: thấy tất cả)
exports.getAdminProducts = async (req, res) => {
    try {
        const sanpham = await productService.getAllProducts(true); // true = is Admin
        res.json(sanpham);
    } catch (error) {
        handleServiceError(res, error);
    }
};

// POST: Thêm sản phẩm
exports.createProduct = async (req, res) => {
    const { error, value } = sanPhamSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({ errors: error.details.map((e) => e.message) });
    }
    try {
        const sp = await productService.createProduct(value);
        res.status(201).json({ message: 'Thêm sản phẩm thành công', sp });
    } catch (error) {
        handleServiceError(res, error);
    }
};

// PUT: Cập nhật sản phẩm
exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const { error, value } = sanPhamSchema.validate(req.body, { abortEarly: false });
    if (error) {
        return res.status(400).json({ errors: error.details.map((e) => e.message) });
    }
    try {
        const sp = await productService.updateProduct(id, value);
        res.json({ message: 'Cập nhật sản phẩm thành công', sp });
    } catch (error) {
        handleServiceError(res, error);
    }
};

// DELETE: Xóa sản phẩm
exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        await productService.deleteProduct(id);
        res.json({ message: 'Đã xóa sản phẩm' });
    } catch (error) {
        handleServiceError(res, error);
    }
};