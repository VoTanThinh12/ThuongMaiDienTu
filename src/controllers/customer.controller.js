const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Đăng ký
exports.register = async (req, res) => {
  try {
    const { email, mat_khau, ho_ten, so_dien_thoai } = req.body;

    // Validate
    if (!email || !mat_khau || !ho_ten) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    // Kiểm tra email tồn tại
    const existingCustomer = await prisma.khach_hang.findUnique({
      where: { email }
    });

    if (existingCustomer) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(mat_khau, 10);

    // Tạo khách hàng
    const customer = await prisma.khach_hang.create({
      data: {
        email,
        mat_khau: hashedPassword,
        ho_ten,
        so_dien_thoai: so_dien_thoai || null
      }
    });

    // Tạo token
    const token = jwt.sign(
      { id: customer.id, type: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Đăng ký thành công',
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        ho_ten: customer.ho_ten
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Lỗi server khi đăng ký' });
  }
};

// Đăng nhập
exports.login = async (req, res) => {
  try {
    const { email, mat_khau } = req.body;

    // Validate
    if (!email || !mat_khau) {
      return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });
    }

    // Tìm khách hàng
    const customer = await prisma.khach_hang.findUnique({
      where: { email }
    });

    if (!customer) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(mat_khau, customer.mat_khau);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    // Kiểm tra trạng thái
    if (!customer.trang_thai) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
    }

    // Tạo token
    const token = jwt.sign(
      { id: customer.id, type: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Đăng nhập thành công',
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        ho_ten: customer.ho_ten
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Lỗi server khi đăng nhập' });
  }
};

// Lấy thông tin cá nhân
exports.getProfile = async (req, res) => {
  try {
    const customer = await prisma.khach_hang.findUnique({
      where: { id: req.customerId },
      select: {
        id: true,
        email: true,
        ho_ten: true,
        so_dien_thoai: true,
        ngay_tao: true
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin khách hàng' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

// Cập nhật thông tin
exports.updateProfile = async (req, res) => {
  try {
    const { ho_ten, so_dien_thoai, mat_khau_cu, mat_khau_moi } = req.body;

    const updateData = {};
    
    if (ho_ten) updateData.ho_ten = ho_ten;
    if (so_dien_thoai) updateData.so_dien_thoai = so_dien_thoai;

    // Nếu muốn đổi mật khẩu
    if (mat_khau_moi) {
      if (!mat_khau_cu) {
        return res.status(400).json({ error: 'Vui lòng nhập mật khẩu cũ' });
      }

      const customer = await prisma.khach_hang.findUnique({
        where: { id: req.customerId }
      });

      const isPasswordValid = await bcrypt.compare(mat_khau_cu, customer.mat_khau);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Mật khẩu cũ không đúng' });
      }

      updateData.mat_khau = await bcrypt.hash(mat_khau_moi, 10);
    }

    const updated = await prisma.khach_hang.update({
      where: { id: req.customerId },
      data: updateData,
      select: {
        id: true,
        email: true,
        ho_ten: true,
        so_dien_thoai: true
      }
    });

    res.json({
      message: 'Cập nhật thành công',
      customer: updated
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};