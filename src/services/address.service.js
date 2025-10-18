// services/address.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const CustomError = require('./CustomError'); // Giả sử bạn tách CustomError ra 1 file

// Lấy tất cả địa chỉ của khách hàng
exports.getAllAddresses = async (customerId) => {
    return prisma.dia_chi_khach.findMany({
        where: { id_khach_hang: customerId },
        orderBy: { mac_dinh: 'desc', id: 'asc' } // Ưu tiên hiển thị địa chỉ mặc định
    });
};

// Thêm địa chỉ mới
exports.createAddress = async (customerId, data) => {
    const { ho_ten_nguoi_nhan, so_dien_thoai, dia_chi_chi_tiet, phuong_xa, quan_huyen, tinh_thanh, mac_dinh = false } = data;

    if (!ho_ten_nguoi_nhan || !so_dien_thoai || !dia_chi_chi_tiet) {
        throw new CustomError('Vui lòng điền đủ thông tin người nhận và địa chỉ', 400);
    }

    // Nếu địa chỉ mới được đặt làm mặc định, hãy hủy đặt mặc định của các địa chỉ cũ
    if (mac_dinh) {
        await prisma.dia_chi_khach.updateMany({
            where: { id_khach_hang: customerId, mac_dinh: true },
            data: { mac_dinh: false }
        });
    }

    return prisma.dia_chi_khach.create({
        data: {
            id_khach_hang: customerId,
            ho_ten_nguoi_nhan,
            so_dien_thoai,
            dia_chi_chi_tiet,
            phuong_xa,
            quan_huyen,
            tinh_thanh,
            mac_dinh
        }
    });
};

// Cập nhật địa chỉ
exports.updateAddress = async (addressId, customerId, data) => {
    const { mac_dinh, ...updateData } = data;

    // Kiểm tra địa chỉ có thuộc về khách hàng này không
    const existing = await prisma.dia_chi_khach.findFirst({
        where: { id: parseInt(addressId), id_khach_hang: customerId }
    });

    if (!existing) {
        throw new CustomError('Không tìm thấy địa chỉ này', 404);
    }
    
    // Xử lý logic đặt mặc định
    if (mac_dinh === true) {
        // Hủy đặt mặc định của các địa chỉ cũ
        await prisma.dia_chi_khach.updateMany({
            where: { id_khach_hang: customerId, mac_dinh: true },
            data: { mac_dinh: false }
        });
        updateData.mac_dinh = true;
    } else if (mac_dinh === false) {
        // Tránh trường hợp người dùng hủy mặc định địa chỉ duy nhất
        const count = await prisma.dia_chi_khach.count({ where: { id_khach_hang: customerId } });
        if (count === 1 && existing.mac_dinh === true) {
             throw new CustomError('Không thể bỏ mặc định địa chỉ duy nhất. Vui lòng thêm địa chỉ mới.', 400);
        }
        updateData.mac_dinh = false;
    }


    return prisma.dia_chi_khach.update({
        where: { id: parseInt(addressId) },
        data: updateData
    });
};

// Xóa địa chỉ
exports.deleteAddress = async (addressId, customerId) => {
    const existing = await prisma.dia_chi_khach.findFirst({
        where: { id: parseInt(addressId), id_khach_hang: customerId }
    });

    if (!existing) {
        throw new CustomError('Không tìm thấy địa chỉ này', 404);
    }
    
    // Nếu đây là địa chỉ mặc định, hệ thống nên yêu cầu đặt một địa chỉ khác làm mặc định trước
    if (existing.mac_dinh) {
        const count = await prisma.dia_chi_khach.count({ where: { id_khach_hang: customerId } });
        if (count > 1) {
            throw new CustomError('Vui lòng đặt một địa chỉ khác làm mặc định trước khi xóa', 400);
        }
    }

    return prisma.dia_chi_khach.delete({
        where: { id: parseInt(addressId) }
    });
};