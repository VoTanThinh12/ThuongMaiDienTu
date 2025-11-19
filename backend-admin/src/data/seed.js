// File: src/data/seed.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Hàm tạo dữ liệu giả lập
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const fakeNames = ["Lê Văn Thành", "Trần Thu Hằng", "Ngô Đức Minh", "Phạm Hải Yến", "Đặng Quang Huy", "Hoàng Thúy Nga", "Bùi Duy Nam", "Tạ Lan Anh", "Vũ Hoàng Long", "Nguyễn Minh Thư"];
const fakeCities = ["TP.HCM", "Hà Nội", "Đà Nẵng", "Hải Phòng", "Cần Thơ"];
const fakeCompanies = ["Việt Phát", "Thái Bình Dương", "An Phát", "Minh Khôi", "Hoàng Gia"];

async function main() {
  console.log('Bắt đầu xóa và thêm dữ liệu mẫu...');

  // Xóa toàn bộ dữ liệu cũ theo đúng thứ tự để không vi phạm ràng buộc khóa ngoại (onDelete: Restrict)
  // 1. Xóa các bảng chi tiết trước
  await prisma.chi_tiet_hoa_don_ban.deleteMany();
  await prisma.chi_tiet_phieu_nhap.deleteMany();
  console.log('Đã xóa dữ liệu chi tiết hóa đơn và phiếu nhập.');

  // 2. Xóa các bảng giao dịch (hóa đơn, phiếu nhập) sau khi các bảng chi tiết đã trống
  await prisma.hoa_don_ban.deleteMany();
  await prisma.phieu_nhap.deleteMany();
  console.log('Đã xóa dữ liệu hóa đơn và phiếu nhập.');

  // 3. Xóa các bảng dữ liệu gốc (sản phẩm, nhân viên, nhà cung cấp)
  await prisma.san_pham.deleteMany();
  await prisma.nhan_vien.deleteMany();
  await prisma.nha_cung_cap.deleteMany();
  console.log('Đã xóa dữ liệu sản phẩm, nhân viên và nhà cung cấp.');


  // --- 1. Thêm 50 nhà cung cấp ---
  const nhaCungCaps = [];
  for (let i = 1; i <= 50; i++) {
    nhaCungCaps.push(await prisma.nha_cung_cap.create({
      data: {
        ten_nha_cung_cap: `Công ty ${fakeCompanies[getRandomInt(0, fakeCompanies.length - 1)]} ${i}`,
        so_dien_thoai: `09${getRandomInt(100000000, 999999999)}`,
        dia_chi: `${getRandomInt(1, 100)} Phố ${String.fromCharCode(64 + i)}, ${fakeCities[getRandomInt(0, fakeCities.length - 1)]}`,
      },
    }));
  }
  console.log(`Đã thêm ${nhaCungCaps.length} nhà cung cấp.`);

  // --- 2. Thêm 50 sản phẩm ---
  const sanPhams = [];
  const donViTinhs = ['Chai', 'Gói', 'Hộp', 'Lon', 'Kg', 'Cái'];
  const fakeProducts = ["Nước ngọt Coca", "Bánh snack Oishi", "Sữa tươi Vinamilk", "Mì tôm Hảo Hảo", "Kem đánh răng P/S", "Bánh Orion ChocoPie"];
  for (let i = 1; i <= 50; i++) {
    sanPhams.push(await prisma.san_pham.create({
      data: {
        ten_san_pham: `${fakeProducts[getRandomInt(0, fakeProducts.length - 1)]} loại ${i}`,
        ma_san_pham: `SP${String(i).padStart(3, '0')}`,
        don_vi_tinh: donViTinhs[getRandomInt(0, donViTinhs.length - 1)],
        gia_ban: getRandomInt(5, 50) * 1000,
        so_luong: getRandomInt(10, 200),
      },
    }));
  }
  console.log(`Đã thêm ${sanPhams.length} sản phẩm.`);

  // --- 3. Thêm 50 nhân viên ---
  const hashedPassword = await bcrypt.hash('password123', 10);
  const vaiTros = ['quan_ly', 'thu_ngan', 'nhan_vien_kho'];
  const nhanViens = [];

  // Tạo 3 tài khoản chính
  nhanViens.push(await prisma.nhan_vien.create({
    data: {
      ho_ten: 'Quản Lý Chính',
      tai_khoan: 'admin',
      mat_khau: hashedPassword,
      vai_tro: 'quan_ly',
      trang_thai: 'Dang_lam',
      email: 'admin@example.com',
      so_dien_thoai: '0987654321'
    }
  }));
  nhanViens.push(await prisma.nhan_vien.create({
    data: {
      ho_ten: 'Trần Thu Ngân',
      tai_khoan: 'thungan',
      mat_khau: hashedPassword,
      vai_tro: 'thu_ngan',
      trang_thai: 'Dang_lam',
      email: 'thungan@example.com',
      so_dien_thoai: '0912345679'
    }
  }));
  nhanViens.push(await prisma.nhan_vien.create({
    data: {
      ho_ten: 'Lê Khoa Học',
      tai_khoan: 'nhanvienkho',
      mat_khau: hashedPassword,
      vai_tro: 'nhan_vien_kho',
      trang_thai: 'Dang_lam',
      email: 'nhanvienkho@example.com',
      so_dien_thoai: '0912345680'
    }
  }));

  // Thêm 47 nhân viên ngẫu nhiên còn lại
  for (let i = 4; i <= 50; i++) {
    nhanViens.push(await prisma.nhan_vien.create({
      data: {
        ho_ten: `${fakeNames[getRandomInt(0, fakeNames.length - 1)]} ${i}`,
        tai_khoan: `nv${i}`,
        mat_khau: hashedPassword,
        vai_tro: vaiTros[getRandomInt(0, vaiTros.length - 1)],
        trang_thai: Math.random() > 0.1 ? 'Dang_lam' : 'Da_nghi',
        so_dien_thoai: `09${getRandomInt(100000000, 999999999)}`,
        dia_chi: `${getRandomInt(1, 100)} Đường ${String.fromCharCode(96 + i)}, ${fakeCities[getRandomInt(0, fakeCities.length - 1)]}`,
        email: `nv${i}@example.com`,
        ngay_sinh: getRandomDate(new Date('1980-01-01'), new Date('2000-01-01')),
        ngay_vao_lam: getRandomDate(new Date('2020-01-01'), new Date()),
      },
    }));
  }
  console.log(`Đã thêm ${nhanViens.length} nhân viên.`);

  // --- 4. Thêm 50 phiếu nhập hàng ---
  const phieuNhaps = [];
  const nhanVienKhoList = nhanViens.filter(nv => nv.vai_tro === 'nhan_vien_kho' && nv.trang_thai === 'Dang_lam');
  if (nhanVienKhoList.length > 0) {
    for (let i = 1; i <= 50; i++) {
      const nhaCungCap = nhaCungCaps[getRandomInt(0, nhaCungCaps.length - 1)];
      const nhanVienKho = nhanVienKhoList[getRandomInt(0, nhanVienKhoList.length - 1)];
      const soLuongChiTiet = getRandomInt(1, 5);
      const chiTietNhap = [];
      for (let j = 0; j < soLuongChiTiet; j++) {
        const sanPham = sanPhams[getRandomInt(0, sanPhams.length - 1)];
        chiTietNhap.push({
          id_san_pham: sanPham.id,
          so_luong_nhap: getRandomInt(10, 100),
          gia_nhap: parseFloat(sanPham.gia_ban) - getRandomInt(500, 2000),
        });
      }
      phieuNhaps.push(await prisma.phieu_nhap.create({
        data: {
          id_nha_cung_cap: nhaCungCap.id,
          id_nhan_vien: nhanVienKho.id,
          ngay_nhap: getRandomDate(new Date('2025-07-01'), new Date('2025-08-08')),
          chi_tiet_phieu_nhap: { create: chiTietNhap },
        },
      }));
    }
    console.log(`Đã thêm ${phieuNhaps.length} phiếu nhập.`);
  } else {
    console.log('Không có nhân viên kho nào để tạo phiếu nhập.');
  }


  // --- 5. Thêm 50 hóa đơn bán hàng ---
  const hoaDonBans = [];
  const thuNganList = nhanViens.filter(nv => nv.vai_tro === 'thu_ngan' && nv.trang_thai === 'Dang_lam');
  if (thuNganList.length > 0) {
    for (let i = 1; i <= 50; i++) {
      const thuNgan = thuNganList[getRandomInt(0, thuNganList.length - 1)];
      const soLuongChiTiet = getRandomInt(1, 5);
      const chiTietBan = [];
      let tongTien = 0;
      for (let j = 0; j < soLuongChiTiet; j++) {
        const sanPham = sanPhams[getRandomInt(0, sanPhams.length - 1)];
        const soLuong = getRandomInt(1, 10);
        chiTietBan.push({
          id_san_pham: sanPham.id,
          so_luong: soLuong,
          don_gia: sanPham.gia_ban,
        });
        tongTien += soLuong * parseFloat(sanPham.gia_ban);
      }
      hoaDonBans.push(await prisma.hoa_don_ban.create({
        data: {
          id_nhan_vien: thuNgan.id,
          ngay_ban: getRandomDate(new Date('2025-07-01'), new Date('2025-08-08')),
          tong_tien: tongTien,
          chi_tiet_hoa_don_ban: { create: chiTietBan },
        },
      }));
    }
    console.log(`Đã thêm ${hoaDonBans.length} hóa đơn bán.`);
  } else {
    console.log('Không có thu ngân nào để tạo hóa đơn.');
  }


  console.log('Dữ liệu mẫu đã được thêm thành công!');
}

main()
  .catch((e) => {
    console.error('Lỗi khi thêm dữ liệu mẫu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });