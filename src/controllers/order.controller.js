// controllers/order.controller.js (Phiên bản mới)
const orderService = require('../services/order.service');

// Hàm chung để xử lý lỗi (tương tự như cart controller)
const handleServiceError = (res, error) => {
    if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
    }
    // Log chi tiết để debug
    console.error('Order error:', error);
    // Trả thông báo chi tiết hơn trong môi trường dev
    const isDev = process.env.NODE_ENV !== 'production';
    return res.status(500).json({
        error: isDev && error?.message ? error.message : 'Lỗi khi xử lý đơn hàng'
    });
};

// Tạo đơn hàng từ giỏ hàng
exports.createOrder = async (req, res) => {
    try {
        const donHang = await orderService.createOrderFromCart(req.customerId, req.body);
        res.status(201).json({
            message: 'Đặt hàng thành công',
            don_hang: donHang
        });
    } catch (error) {
        handleServiceError(res, error);
    }
};

// Lấy danh sách đơn hàng của khách hàng
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await orderService.getOrdersByCustomer(req.customerId);
        res.json(orders);
    } catch (error) {
        handleServiceError(res, error);
    }
};

// Lấy chi tiết 1 đơn hàng
exports.getOrderDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await orderService.getOrderDetailByCustomer(id, req.customerId);
        res.json(order);
    } catch (error) {
        handleServiceError(res, error);
    }
};

// Hủy đơn hàng (chỉ khi còn chờ xác nhận)
exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        await orderService.cancelOrder(id, req.customerId);
        res.json({ message: 'Đã hủy đơn hàng thành công' });
    } catch (error) {
        handleServiceError(res, error);
    }
};

// Cập nhật đơn hàng (chỉ khi còn chờ xác nhận)
exports.updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedOrder = await orderService.updateOrderByCustomer(id, req.customerId, req.body);
        res.json({
            message: 'Cập nhật đơn hàng thành công',
            don_hang: updatedOrder
        });
    } catch (error) {
        handleServiceError(res, error);
    }
};

// [ADMIN] Lấy tất cả đơn hàng
exports.getAllOrders = async (req, res) => {
    try {
        const { trang_thai } = req.query;
        const orders = await orderService.getAllOrdersAdmin(trang_thai);
        res.json(orders);
    } catch (error) {
        handleServiceError(res, error);
    }
};

// [ADMIN] Cập nhật trạng thái đơn hàng
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { trang_thai } = req.body;
        const order = await orderService.updateOrderStatusAdmin(id, trang_thai);

        res.json({
            message: 'Cập nhật trạng thái thành công',
            order
        });
    } catch (error) {
        handleServiceError(res, error);
    }
};