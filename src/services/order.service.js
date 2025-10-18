// services/order.service.js
const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();
// Gỡ bỏ tích hợp mã giảm giá để khớp schema hiện tại (không có bảng mã giảm giá)

// Giả sử CustomError được khai báo hoặc import
class CustomError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}

// ------------------------------------------
// 1. Tạo đơn hàng từ giỏ hàng (Chức năng cốt lõi)
// ------------------------------------------
function toNumber(decimalLike) {
    if (decimalLike === null || decimalLike === undefined) return 0;
    if (typeof decimalLike === 'number') return decimalLike;
    try {
        return parseFloat(decimalLike.toString());
    } catch (_) {
        return Number(decimalLike) || 0;
    }
}
exports.createOrderFromCart = async (customerId, data) => {
    const { 
        dia_chi_giao_hang, 
        ho_ten_nguoi_nhan, 
        so_dien_thoai, 
        phuong_thuc_thanh_toan, 
        ghi_chu, 
        voucher_info,
        selected_item_ids
    } = data;

    // 1. Validate
    if (!dia_chi_giao_hang || !ho_ten_nguoi_nhan || !so_dien_thoai || !phuong_thuc_thanh_toan) {
        throw new CustomError('Vui lòng điền đầy đủ thông tin giao hàng', 400);
    }

    // 2. Lấy giỏ hàng và kiểm tra
    let cartItems = await prisma.gio_hang.findMany({
        where: { id_khach_hang: customerId },
        include: { san_pham: true }
    });

    if (cartItems.length === 0) {
        throw new CustomError('Giỏ hàng trống', 400);
    }

    // 2.1. Nếu có danh sách item được chọn, chỉ giữ các item này
    let selectedIds = Array.isArray(selected_item_ids) ? selected_item_ids.map((v) => Number(v)).filter(Boolean) : [];
    if (selectedIds.length > 0) {
        cartItems = cartItems.filter((ci) => selectedIds.includes(ci.id));
        if (cartItems.length === 0) {
            throw new CustomError('Không tìm thấy sản phẩm đã chọn trong giỏ', 400);
        }
    } else {
        // Nếu không truyền selected_item_ids, coi như chọn tất cả (hành vi cũ)
        selectedIds = cartItems.map((ci) => ci.id);
    }

    // 3. Kiểm tra tồn kho cho các item được chọn
    for (const item of cartItems) {
        if (item.san_pham.so_luong < item.so_luong) {
            throw new CustomError(`Sản phẩm "${item.san_pham.ten_san_pham}" chỉ còn ${item.san_pham.so_luong} ${item.san_pham.don_vi_tinh}`, 400);
        }
    }

    // 4. Tính toán tổng tiền BAN ĐẦU (chưa giảm giá)
    let tong_tien_goc = cartItems.reduce((sum, item) => {
        return sum + (Number(item.san_pham.gia_ban) * item.so_luong);
    }, 0);

    // 5. ÁP DỤNG LOGIC VOUCHER
    let finalTotal = tong_tien_goc;
    let voucherDiscount = 0;
    // Hoist voucher record so it can be safely referenced inside the transaction
    let voucherRecord = null;

    if (voucher_info && voucher_info.ma_voucher) {
        // Validate voucher
        voucherRecord = await prisma.voucher.findUnique({
            where: { ma_voucher: voucher_info.ma_voucher }
        });

        if (!voucherRecord) {
            throw new CustomError('Voucher không tồn tại', 400);
        }

        // Kiểm tra voucher còn hiệu lực
        const now = new Date();
        if (voucherRecord.ngay_ket_thuc < now) {
            throw new CustomError('Voucher đã hết hạn', 400);
        }

        if (voucherRecord.so_luong_da_dung >= voucherRecord.so_luong) {
            throw new CustomError('Voucher đã hết lượt sử dụng', 400);
        }

        if (voucherRecord.trang_thai !== 'hoat_dong') {
            throw new CustomError('Voucher không khả dụng', 400);
        }

        // Kiểm tra giá trị tối thiểu
        const minOrderValue = voucherRecord.gia_tri_toi_thieu ? toNumber(voucherRecord.gia_tri_toi_thieu) : null;
        if (minOrderValue && tong_tien_goc < minOrderValue) {
            const minOrderText = new Intl.NumberFormat('vi-VN').format(minOrderValue);
            throw new CustomError(`Đơn hàng phải có giá trị tối thiểu ${minOrderText}đ`, 400);
        }

        // Tính toán số tiền giảm
        const discountValue = toNumber(voucherRecord.gia_tri_giam);
        if (voucherRecord.loai_giam_gia === 'phan_tram') {
            voucherDiscount = (tong_tien_goc * discountValue) / 100;
        } else {
            voucherDiscount = discountValue;
        }

        // Áp dụng giới hạn tối đa
        const maxDiscount = voucherRecord.gia_tri_toi_da ? toNumber(voucherRecord.gia_tri_toi_da) : null;
        if (maxDiscount && voucherDiscount > maxDiscount) {
            voucherDiscount = maxDiscount;
        }

        // Đảm bảo không giảm quá tổng tiền
        if (voucherDiscount > tong_tien_goc) {
            voucherDiscount = tong_tien_goc;
        }

        finalTotal = tong_tien_goc - voucherDiscount;
    }

    // 6. Tạo mã đơn hàng và làm tròn tổng tiền cuối cùng
    const ma_don_hang = `DH${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const final_tong_tien = finalTotal.toFixed(2); // pass as string for Decimal

    // 7. Thực thi Transaction để đảm bảo tính toàn vẹn
    return prisma.$transaction(async (tx) => {
        // Tạo đơn hàng
        const order = await tx.don_hang.create({
            data: {
                ma_don_hang,
                id_khach_hang: customerId,
                tong_tien: final_tong_tien,
                dia_chi_giao_hang,
                ho_ten_nguoi_nhan,
                so_dien_thoai,
                phuong_thuc_thanh_toan,
                ghi_chu: ghi_chu || null,
                trang_thai: 'cho_xac_nhan',
                trang_thai_thanh_toan: phuong_thuc_thanh_toan === 'cod' ? false : false, 
                chi_tiet_don_hang: {
                    create: cartItems.map(item => ({
                        id_san_pham: item.id_san_pham,
                        ten_san_pham: item.san_pham.ten_san_pham,
                        so_luong: item.so_luong,
                        don_gia: toNumber(item.san_pham.gia_ban).toFixed(2)
                    }))
                },
            },
            include: { chi_tiet_don_hang: true }
        });

        // Xử lý voucher nếu có
        if (voucherRecord) {
            try {
                // Tạo record sử dụng voucher
                await tx.su_dung_voucher.create({
                    data: {
                        id_voucher: voucherRecord.id,
                        id_don_hang: order.id,
                        id_khach_hang: customerId,
                    so_tien_giam: Number(voucherDiscount).toFixed(2)
                    }
                });

                // Cập nhật số lượng đã dùng
                await tx.voucher.update({
                    where: { id: voucherRecord.id },
                    data: {
                        so_luong_da_dung: { increment: 1 }
                    }
                });
            } catch (persistErr) {
                // Không để việc ghi nhận voucher làm hỏng việc tạo đơn hàng
                console.error('Voucher persistence error:', persistErr);
            }
        }

        // Trừ tồn kho (Atomic Update) theo các item được chọn
        await Promise.all(
            cartItems.map(item =>
                tx.san_pham.update({
                    where: { id: item.id_san_pham },
                    data: { so_luong: { decrement: item.so_luong } }
                })
            )
        );

        // Xóa các item đã dùng để tạo đơn (KHÔNG xóa toàn bộ giỏ)
        await tx.gio_hang.deleteMany({
            where: { id_khach_hang: customerId, id: { in: selectedIds } }
        });

        return order;
    });
};

// ------------------------------------------
// 2. Lấy danh sách đơn hàng của khách hàng
// ------------------------------------------
exports.getOrdersByCustomer = async (customerId) => {
    return prisma.don_hang.findMany({
        where: { id_khach_hang: customerId },
        select: {
            id: true,
            ma_don_hang: true,
            tong_tien: true,
            trang_thai: true,
            phuong_thuc_thanh_toan: true,
            trang_thai_thanh_toan: true,
            dia_chi_giao_hang: true,
            ho_ten_nguoi_nhan: true,
            so_dien_thoai: true,
            ghi_chu: true,
            ngay_tao: true,
            ngay_cap_nhat: true,
            chi_tiet_don_hang: {
                select: { 
                    id: true,
                    ten_san_pham: true, 
                    so_luong: true, 
                    don_gia: true,
                    san_pham: {
                        select: {
                            ten_san_pham: true,
                            ma_san_pham: true,
                            hinh_anh: true
                        }
                    }
                }
            }
        },
        orderBy: { ngay_tao: 'desc' }
    });
};

// ------------------------------------------
// 3. Lấy chi tiết đơn hàng
// ------------------------------------------
exports.getOrderDetailByCustomer = async (orderId, customerId) => {
    const isNumericId = /^\d+$/.test(String(orderId));
    const whereClause = isNumericId
        ? { id: parseInt(orderId), id_khach_hang: customerId }
        : { ma_don_hang: String(orderId), id_khach_hang: customerId };

    const order = await prisma.don_hang.findFirst({
        where: whereClause,
        include: {
            chi_tiet_don_hang: {
                include: { san_pham: { select: { ten_san_pham: true, ma_san_pham: true, don_vi_tinh: true } } }
            }
        }
    });

    if (!order) {
        throw new CustomError('Không tìm thấy đơn hàng', 404);
    }
    return order;
};

// ------------------------------------------
// 4. Hủy đơn hàng
// ------------------------------------------
exports.cancelOrder = async (orderId, customerId) => {
    const isNumericId = /^\d+$/.test(String(orderId));
    const whereClause = isNumericId
        ? { id: parseInt(orderId), id_khach_hang: customerId }
        : { ma_don_hang: String(orderId), id_khach_hang: customerId };

    const order = await prisma.don_hang.findFirst({
        where: whereClause,
        include: { chi_tiet_don_hang: true }
    });

    if (!order) {
        throw new CustomError('Không tìm thấy đơn hàng', 404);
    }

    if (order.trang_thai !== 'cho_xac_nhan') {
        throw new CustomError('Chỉ có thể hủy đơn hàng đang chờ xác nhận', 400);
    }

    // Thực hiện hủy và hoàn kho trong Transaction
    await prisma.$transaction(async (tx) => {
        await tx.don_hang.update({
            where: isNumericId ? { id: parseInt(orderId) } : { ma_don_hang: String(orderId) },
            data: { trang_thai: 'da_huy' }
        });

        // Hoàn lại tồn kho
        await Promise.all(
            order.chi_tiet_don_hang.map(item =>
                tx.san_pham.update({
                    where: { id: item.id_san_pham },
                    data: { so_luong: { increment: item.so_luong } }
                })
            )
        );
        
        // TODO: Cân nhắc hoàn lại lượt sử dụng mã giảm giá nếu mã đó không bị giới hạn 1 lần dùng
        // if (order.id_ma_giam_gia) { ... }
    });
};

// ------------------------------------------
// 5. [ADMIN] Lấy tất cả đơn hàng
// ------------------------------------------
exports.getAllOrdersAdmin = async (trang_thai) => {
    const where = trang_thai ? { trang_thai } : {};

    return prisma.don_hang.findMany({
        where,
        // Tối ưu select cho admin view
        include: {
            khach_hang: { select: { ho_ten: true, email: true, so_dien_thoai: true } },
            chi_tiet_don_hang: {
                select: { ten_san_pham: true, so_luong: true, don_gia: true }
            }
        },
        orderBy: { ngay_tao: 'desc' }
    });
};

// ------------------------------------------
// 6. [ADMIN] Cập nhật trạng thái
// ------------------------------------------
exports.updateOrderStatusAdmin = async (orderId, trang_thai) => {
    const validStatuses = ['cho_xac_nhan', 'da_xac_nhan', 'dang_giao', 'da_giao', 'da_huy'];
    if (!validStatuses.includes(trang_thai)) {
        throw new CustomError('Trạng thái không hợp lệ', 400);
    }

    return prisma.don_hang.update({
        where: { id: parseInt(orderId) },
        data: { trang_thai },
        include: {
            khach_hang: { select: { ho_ten: true, email: true } }
        }
    });
};

// ------------------------------------------
// 7. Cập nhật đơn hàng của khách hàng
// ------------------------------------------
exports.updateOrderByCustomer = async (orderId, customerId, updateData) => {
    const { 
        ho_ten_nguoi_nhan, 
        so_dien_thoai, 
        dia_chi_giao_hang, 
        phuong_thuc_thanh_toan, 
        ghi_chu 
    } = updateData;

    // 1. Kiểm tra đơn hàng có tồn tại và thuộc về khách hàng không
    const isNumericId = /^\d+$/.test(String(orderId));
    const whereClause = isNumericId
        ? { id: parseInt(orderId), id_khach_hang: customerId }
        : { ma_don_hang: String(orderId), id_khach_hang: customerId };

    const existingOrder = await prisma.don_hang.findFirst({
        where: whereClause
    });

    if (!existingOrder) {
        throw new CustomError('Không tìm thấy đơn hàng', 404);
    }

    // 2. Kiểm tra trạng thái đơn hàng (chỉ cho phép chỉnh sửa khi chờ xác nhận hoặc đã xác nhận)
    if (!['cho_xac_nhan', 'da_xac_nhan'].includes(existingOrder.trang_thai)) {
        throw new CustomError('Không thể chỉnh sửa đơn hàng ở trạng thái này', 400);
    }

    // 3. Validate dữ liệu
    if (!ho_ten_nguoi_nhan || !so_dien_thoai || !dia_chi_giao_hang || !phuong_thuc_thanh_toan) {
        throw new CustomError('Vui lòng điền đầy đủ thông tin', 400);
    }

    // 4. Cập nhật đơn hàng
    const updatedOrder = await prisma.don_hang.update({
        where: isNumericId ? { id: parseInt(orderId) } : { ma_don_hang: String(orderId) },
        data: {
            ho_ten_nguoi_nhan,
            so_dien_thoai,
            dia_chi_giao_hang,
            phuong_thuc_thanh_toan,
            ghi_chu: ghi_chu || null,
            ngay_cap_nhat: new Date()
        },
        include: {
            khach_hang: { select: { ho_ten: true, email: true } },
            chi_tiet_don_hang: {
                include: { san_pham: { select: { ten_san_pham: true, ma_san_pham: true } } }
            }
        }
    });

    return updatedOrder;
};