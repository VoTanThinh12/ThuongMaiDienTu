// controllers/cart.controller.js (Phiên bản mới)
const cartService = require('../services/cart.service');

// Hàm chung để xử lý lỗi (nên đặt ở middleware hoặc file tiện ích)
const handleServiceError = (res, error) => {
    if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Cart error:', error);
    const payload = { error: 'Lỗi server' };
    if (process.env.NODE_ENV !== 'production') {
        payload.detail = error?.message || String(error);
    }
    res.status(500).json(payload);
};

// Lấy giỏ hàng
exports.getCart = async (req, res) => {
    try {
        const cartItems = await cartService.getCartItems(req.customerId);
        res.json(cartItems);
    } catch (error) {
        handleServiceError(res, error);
    }
};

// Thêm sản phẩm vào giỏ
exports.addToCart = async (req, res) => {
    try {
        const { id_san_pham, so_luong } = req.body;
        const cartItem = await cartService.addItemToCart(req.customerId, id_san_pham, so_luong);

        res.json({
            message: 'Đã thêm vào giỏ hàng',
            cartItem
        });
    } catch (error) {
        handleServiceError(res, error);
    }
};

// Cập nhật số lượng
exports.updateCartItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { so_luong } = req.body;

        const updated = await cartService.updateCartItemQuantity(id, req.customerId, so_luong);

        res.json(updated);
    } catch (error) {
        handleServiceError(res, error);
    }
};

// Xóa sản phẩm khỏi giỏ
exports.removeFromCart = async (req, res) => {
    try {
        const { id } = req.params;

        await cartService.removeCartItem(id, req.customerId);

        res.json({ message: 'Đã xóa sản phẩm khỏi giỏ hàng' });
    } catch (error) {
        handleServiceError(res, error);
    }
};

// Xóa toàn bộ giỏ hàng
exports.clearCart = async (req, res) => {
    try {
        await cartService.clearCart(req.customerId);
        res.json({ message: 'Đã xóa toàn bộ giỏ hàng' });
    } catch (error) {
        handleServiceError(res, error);
    }
};