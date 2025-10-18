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

  // Kiểm tra xem có sản phẩm nào đã có ảnh chưa
  const existingProducts = await prisma.san_pham.findMany({
    where: {
      hinh_anh: {
        not: ''
      }
    }
  });
  
  if (existingProducts.length > 0) {
    console.log(`Tìm thấy ${existingProducts.length} sản phẩm đã có ảnh. Sẽ bỏ qua việc xóa sản phẩm để giữ lại ảnh.`);
    console.log('Chỉ xóa các dữ liệu giao dịch và thêm dữ liệu mẫu khác...');
    
    // Chỉ xóa các bảng giao dịch, không xóa sản phẩm
    await prisma.chi_tiet_don_hang.deleteMany();
    await prisma.gio_hang.deleteMany();
    await prisma.chi_tiet_hoa_don_ban.deleteMany();
    await prisma.chi_tiet_phieu_nhap.deleteMany();
    console.log('Đã xóa chi tiết đơn hàng, giỏ hàng, chi tiết hóa đơn và phiếu nhập.');

    await prisma.don_hang.deleteMany();
    await prisma.hoa_don_ban.deleteMany();
    await prisma.phieu_nhap.deleteMany();
    console.log('Đã xóa đơn hàng, hóa đơn và phiếu nhập.');
    
    // Không xóa sản phẩm, nhân viên, nhà cung cấp, khách hàng
    console.log('Giữ nguyên sản phẩm, nhân viên, nhà cung cấp, khách hàng để bảo toàn dữ liệu.');
  } else {
    console.log('Không có sản phẩm nào có ảnh. Thực hiện seed đầy đủ...');
    
    // Xóa toàn bộ dữ liệu cũ theo đúng thứ tự để không vi phạm ràng buộc khóa ngoại
    // 1. Xóa các bảng chi tiết liên quan đến đơn hàng/gio hàng trước
    await prisma.chi_tiet_don_hang.deleteMany();
    await prisma.gio_hang.deleteMany();
    await prisma.chi_tiet_hoa_don_ban.deleteMany();
    await prisma.chi_tiet_phieu_nhap.deleteMany();
    console.log('Đã xóa chi tiết đơn hàng, giỏ hàng, chi tiết hóa đơn và phiếu nhập.');

    // 2. Xóa các bảng giao dịch
    await prisma.don_hang.deleteMany();
    await prisma.hoa_don_ban.deleteMany();
    await prisma.phieu_nhap.deleteMany();
    console.log('Đã xóa đơn hàng, hóa đơn và phiếu nhập.');

    // 3. Xóa các bảng gốc
    await prisma.san_pham.deleteMany();
    await prisma.nhan_vien.deleteMany();
    await prisma.nha_cung_cap.deleteMany();
    await prisma.khach_hang.deleteMany();
    console.log('Đã xóa sản phẩm, nhân viên, nhà cung cấp, khách hàng.');
  }


  // --- 1. Thêm 50 nhà cung cấp ---
  let nhaCungCaps = [];
  if (existingProducts.length === 0) {
    // Chỉ tạo nhà cung cấp khi seed đầy đủ
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
  } else {
    // Lấy nhà cung cấp hiện có để tạo phiếu nhập
    nhaCungCaps = await prisma.nha_cung_cap.findMany();
    console.log(`Sử dụng ${nhaCungCaps.length} nhà cung cấp hiện có.`);
  }

  // --- 2. Thêm sản phẩm mô phỏng cửa hàng tiện lợi ---
  let sanPhams = [];
  const CATEGORIES = ['drinks','snacks','dairy','instant','frozen','household','personalcare','groceries'];
  const inferCategory = (name) => {
    const n = name.toLowerCase();
    if (/(coca|pepsi|7up|aquafina|lavie|red bull|sting|cà phê|ca phe|coffee|tra |trà |twister|c2|number one)/.test(n)) return 'drinks';
    if (/(snack|poca|oishi|bánh |banh |oreo|chocopie|cosy|cookies|cracker)/.test(n)) return 'snacks';
    if (/(sữa|sua|vinamilk|yakult|th true milk|yogurt|sua chua)/.test(n)) return 'dairy';
    if (/(mì |mi |3 miền|3 mien|hảo hảo|hao hao|omachi|vifon|phở|pho)/.test(n)) return 'instant';
    if (/(kem|cornetto|merino|đông lạnh|dong lanh|chả cá|cha ca|xúc xích|xuc xich|thịt viên|thit vien)/.test(n)) return 'frozen';
    if (/(khăn giấy|giấy vệ sinh|sunlight|gift|nước lau|nuoc lau|bột giặt|bot giat|nước xả|nuoc xa|xịt phòng|xit phong|lau kính|lau kinh|bật lửa|bat lua|pin|ô dù|o du|túi rác|tui rac)/.test(n)) return 'household';
    if (/(dầu gội|dau goi|sữa tắm|sua tam|p\/s|colgate|dao cạo|dao cao|sua rua mat|head & shoulders|dove|lăn khử mùi|lan khu mui|nước súc miệng|nuoc suc mieng|kem cạo râu|kem cao rau)/.test(n)) return 'personalcare';
    if (/(nước mắm|nuoc mam|dầu ăn|dau an|trứng|trung|bánh mì|banh mi|muối|muoi|đường|duong|gạo|gao|ngũ cốc|ngu coc|mật ong|mat ong|tương ớt|nuoc tuong|tuong ot)/.test(n)) return 'groceries';
    return CATEGORIES[getRandomInt(0, CATEGORIES.length - 1)];
  };
  // Hàm trả về placeholder cho ảnh sản phẩm - để bạn tự nhập tay
  const getImagePlaceholder = (name) => {
    // Trả về chuỗi rỗng hoặc placeholder để bạn có thể tự nhập link ảnh
    return ''; // hoặc có thể dùng: `placeholder_${name.replace(/\s+/g, '_').toLowerCase()}`
  };

  const productsCatalog = [
    { ten: 'Coca-Cola 330ml', dv: 'Lon', gia: 9000 },
    { ten: 'Pepsi 330ml', dv: 'Lon', gia: 9000 },
    { ten: '7Up 330ml', dv: 'Lon', gia: 9000 },
    { ten: 'Red Bull 250ml', dv: 'Lon', gia: 15000 },
    { ten: 'Sting Dâu 330ml', dv: 'Lon', gia: 10000 },
    { ten: 'Aquafina 500ml', dv: 'Chai', gia: 7000 },
    { ten: 'Lavie 500ml', dv: 'Chai', gia: 7000 },
    { ten: 'Number One Chanh 330ml', dv: 'Lon', gia: 9000 },
    { ten: 'C2 Trà xanh 500ml', dv: 'Chai', gia: 11000 },
    { ten: 'Twister Cam 1L', dv: 'Chai', gia: 34000 },
    { ten: 'Sữa tươi Vinamilk 180ml', dv: 'Hộp', gia: 8000 },
    { ten: 'Sữa chua Vinamilk Lốc 4', dv: 'Lốc', gia: 28000 },
    { ten: 'TH True Milk 180ml', dv: 'Hộp', gia: 8500 },
    { ten: 'Yakult Lốc 5 chai', dv: 'Lốc', gia: 34000 },
    { ten: 'Snack Oishi Tôm cay 45g', dv: 'Gói', gia: 12000 },
    { ten: 'Snack Poca Khoai tây 53g', dv: 'Gói', gia: 13000 },
    { ten: 'Bánh ChocoPie 360g', dv: 'Hộp', gia: 42000 },
    { ten: 'Bánh Oreo 133g', dv: 'Gói', gia: 16000 },
    { ten: 'Bánh quy Cosy 240g', dv: 'Hộp', gia: 38000 },
    { ten: 'Mì Hảo Hảo tôm chua cay', dv: 'Gói', gia: 5000 },
    { ten: 'Mì Omachi sườn hầm', dv: 'Gói', gia: 8000 },
    { ten: 'Mì 3 Miền bò hầm', dv: 'Gói', gia: 6500 },
    { ten: 'Phở ăn liền Vifon', dv: 'Gói', gia: 9000 },
    { ten: 'Trứng gà 10 quả', dv: 'Vỉ', gia: 32000 },
    { ten: 'Xúc xích CP 200g', dv: 'Gói', gia: 28000 },
    { ten: 'Thanh cua 200g', dv: 'Gói', gia: 32000 },
    { ten: 'Chả cá viên 200g', dv: 'Gói', gia: 30000 },
    { ten: 'Cơm nắm Onigiri', dv: 'Cái', gia: 15000 },
    { ten: 'Bánh mì sandwich 500g', dv: 'Gói', gia: 22000 },
    { ten: 'Trà sữa đóng chai 350ml', dv: 'Chai', gia: 18000 },
    { ten: 'Cà phê lon Highlands 235ml', dv: 'Lon', gia: 18000 },
    { ten: 'Cà phê sữa G7 3in1 16g', dv: 'Gói', gia: 3000 },
    { ten: 'Kem Cornetto', dv: 'Cái', gia: 12000 },
    { ten: 'Kem Merino ốc quế', dv: 'Cái', gia: 10000 },
    { ten: 'Bánh bao nhân thịt', dv: 'Cái', gia: 15000 },
    { ten: 'Xúc xích rán', dv: 'Cái', gia: 10000 },
    { ten: 'Bàn chải P/S', dv: 'Cái', gia: 18000 },
    { ten: 'Kem đánh răng Colgate 180g', dv: 'Tuýp', gia: 32000 },
    { ten: 'Dầu gội Clear 340g', dv: 'Chai', gia: 89000 },
    { ten: 'Sữa tắm Lifebuoy 530g', dv: 'Chai', gia: 105000 },
    { ten: 'Nước rửa chén Sunlight 750g', dv: 'Chai', gia: 36000 },
    { ten: 'Nước lau sàn Gift 1L', dv: 'Chai', gia: 42000 },
    { ten: 'Khăn giấy rút AnAn', dv: 'Gói', gia: 23000 },
    { ten: 'Giấy vệ sinh BlessYou 10 cuộn', dv: 'Lốc', gia: 54000 },
    { ten: 'Khẩu trang 4 lớp 10 cái', dv: 'Hộp', gia: 18000 },
    { ten: 'Pin tiểu AA đôi', dv: 'Vỉ', gia: 12000 },
    { ten: 'Sạc dự phòng mini 5000mAh', dv: 'Cái', gia: 159000 },
    { ten: 'Ô dù gấp gọn', dv: 'Cái', gia: 69000 },
    { ten: 'Bật lửa', dv: 'Cái', gia: 6000 },
    { ten: 'Bộ dao cạo râu', dv: 'Bộ', gia: 25000 },
    { ten: 'Nước mắm Chinsu 500ml', dv: 'Chai', gia: 42000 },
    { ten: 'Dầu ăn Tường An 1L', dv: 'Chai', gia: 52000 },
    // Thêm đa dạng danh mục: frozen, household, personalcare, groceries
    { ten: 'Kem que vani 60ml', dv: 'Cái', gia: 8000 },
    { ten: 'Kem hộp socola 450ml', dv: 'Hộp', gia: 65000 },
    { ten: 'Cá basa phi lê đông lạnh 500g', dv: 'Gói', gia: 72000 },
    { ten: 'Thịt bò viên 300g', dv: 'Gói', gia: 56000 },
    { ten: 'Rong biển ăn liền', dv: 'Gói', gia: 12000 },
    { ten: 'Khăn giấy ướt 80 tờ', dv: 'Gói', gia: 28000 },
    { ten: 'Nước lau kính 500ml', dv: 'Chai', gia: 32000 },
    { ten: 'Nước xịt phòng hương lavender', dv: 'Chai', gia: 45000 },
    { ten: 'Bột giặt 2.5kg', dv: 'Túi', gia: 92000 },
    { ten: 'Nước xả vải 3.2L', dv: 'Chai', gia: 148000 },
    { ten: 'Dao lam cạo râu 5 cái', dv: 'Vỉ', gia: 19000 },
    { ten: 'Sữa rửa mặt than tre 100g', dv: 'Tuýp', gia: 68000 },
    { ten: 'Dầu gội Head & Shoulders 625ml', dv: 'Chai', gia: 165000 },
    { ten: 'Sữa tắm Dove 530g', dv: 'Chai', gia: 115000 },
    { ten: 'Nước tương đậm đặc 500ml', dv: 'Chai', gia: 26000 },
    { ten: 'Tương ớt Chinsu 500g', dv: 'Chai', gia: 28000 },
    { ten: 'Muối i-ốt 500g', dv: 'Gói', gia: 7000 },
    { ten: 'Đường trắng 1kg', dv: 'Gói', gia: 23000 },
    { ten: 'Gạo thơm Jasmine 5kg', dv: 'Túi', gia: 165000 },
    { ten: 'Nước mắm Nam Ngư 900ml', dv: 'Chai', gia: 52000 },
    { ten: 'Ngũ cốc dinh dưỡng 400g', dv: 'Hộp', gia: 68000 },
    { ten: 'Mật ong nguyên chất 500ml', dv: 'Chai', gia: 98000 }
  ];

  if (existingProducts.length === 0) {
    // Chỉ tạo sản phẩm khi chưa có sản phẩm nào có ảnh
    console.log('Tạo sản phẩm mới...');
    
    // Insert base catalog with inferred categories
    const usedNames = new Set();
    const usedBaseNames = new Set();
    const extractBaseName = (full) => {
      let s = full.toLowerCase();
      s = s.replace(/- mã\s*\d+$/i, '').trim();
      s = s.replace(/\b\d+\s*(ml|g|kg|l)\b/gi, '').trim();
      return s.replace(/\s+/g, ' ').trim();
    };
    for (let i = 0; i < productsCatalog.length; i++) {
    const item = productsCatalog[i];
    let ten = item.ten;
    // Ensure unique product names
    let suffix = 1;
    while (usedNames.has(ten.toLowerCase())) {
      suffix += 1;
      ten = `${item.ten} (${suffix})`;
    }
    const base = extractBaseName(ten);
    if (usedBaseNames.has(base)) {
      continue; // skip duplicate base from initial list just in case
    }
    usedNames.add(ten.toLowerCase());
    usedBaseNames.add(base);
    sanPhams.push(await prisma.san_pham.create({
      data: {
        ten_san_pham: ten,
        ma_san_pham: `SP${String(i + 1).padStart(3, '0')}`,
        don_vi_tinh: item.dv,
        gia_ban: item.gia,
        so_luong: getRandomInt(5, 120),
        hinh_anh: item.img || getImagePlaceholder(ten),
        danh_muc: inferCategory(ten)
      },
    }));
  }

  // Generate more products to reach ~200 (category-balanced)
  let counter = productsCatalog.length;
  const perCategoryToAdd = Math.max(0, Math.floor((200 - counter) / CATEGORIES.length));
  const extraTemplates = {
    drinks: ['Nước ngọt vị cam', 'Nước chanh leo', 'Trà chanh mật ong', 'Nước khoáng có gas', 'Soda việt quất'],
    snacks: ['Bánh quy bơ', 'Snack rong biển', 'Kẹo dẻo trái cây', 'Bánh mì que', 'Bắp rang bơ'],
    dairy: ['Sữa tươi tiệt trùng', 'Sữa chua uống vị dâu', 'Phô mai lát', 'Bơ mặn', 'Váng sữa'],
    instant: ['Mì ly hương gà', 'Mì ly hương bò', 'Cháo ăn liền thịt bằm', 'Miến ăn liền', 'Bún ăn liền'],
    frozen: ['Há cảo đông lạnh', 'Bánh bao kim sa', 'Xúc xích phô mai', 'Khoai tây chiên đông lạnh', 'Gà viên'],
    household: ['Nước lau sàn hương sả', 'Nước rửa tay diệt khuẩn', 'Nước tẩy bồn cầu', 'Túi rác tự huỷ', 'Khăn đa năng'],
    personalcare: ['Nước súc miệng', 'Lăn khử mùi', 'Dầu gội thảo dược', 'Sữa tắm dưỡng ẩm', 'Kem cạo râu'],
    groceries: ['Nước tương 1L', 'Dầu ăn hướng dương', 'Bột nêm', 'Nước mắm 35N', 'Bột cacao']
  };

  for (const cat of CATEGORIES) {
    for (let k = 0; k < perCategoryToAdd; k++) {
      const base = extraTemplates[cat][getRandomInt(0, extraTemplates[cat].length - 1)];
      // Choose units by category to avoid ml/g mismatch
      let sizeUnit;
      let amount;
      let unitSuffix;
      if (cat === 'drinks') {
        sizeUnit = ['Chai','Lon'][getRandomInt(0,1)];
        amount = [250, 330, 350, 500, 1000][getRandomInt(0,4)];
        unitSuffix = 'ml';
      } else if (cat === 'household' || cat === 'personalcare') {
        // Liquids tend to be ml, powders g
        const liquid = /^(nước|nuoc|dầu gội|dau goi|sữa tắm|sua tam)/i.test(base);
        if (liquid) {
          sizeUnit = 'Chai';
          amount = [250, 340, 500, 750, 1000][getRandomInt(0,4)];
          unitSuffix = 'ml';
        } else {
          sizeUnit = ['Hộp','Gói','Túi'][getRandomInt(0,2)];
          amount = [100, 200, 300, 500, 1000][getRandomInt(0,4)];
          unitSuffix = 'g';
        }
      } else {
        sizeUnit = ['Gói','Hộp','Túi'][getRandomInt(0,2)];
        amount = [100,150,200,250,300,400,500,750,1000][getRandomInt(0,8)];
        unitSuffix = 'g';
      }
      let ten = `${base} ${amount}${unitSuffix}`;
      let suffix = 1;
      while (usedNames.has(ten.toLowerCase())) {
        suffix += 1;
        ten = `${base} ${amount}${unitSuffix} - mã ${suffix}`;
      }
      let baseName = extractBaseName(ten);
      if (usedBaseNames.has(baseName)) {
        // try to find a different base quickly
        let attempts = 0;
        let newBase = base;
        while (attempts < 3 && usedBaseNames.has(extractBaseName(newBase))) {
          newBase = extraTemplates[cat][getRandomInt(0, extraTemplates[cat].length - 1)];
          attempts++;
        }
        // rebuild name with new base
        if (attempts > 0) {
          baseName = extractBaseName(newBase);
          ten = `${newBase} ${amount}${unitSuffix}`;
        } else {
          // As last resort, append qualifier to make base unique
          newBase = `${base} đặc biệt`;
          ten = `${newBase} ${amount}${unitSuffix}`;
          baseName = extractBaseName(newBase);
        }
      }
      usedNames.add(ten.toLowerCase());
      usedBaseNames.add(baseName);
      const gia = getRandomInt(5000, 180000);
      sanPhams.push(await prisma.san_pham.create({
        data: {
          ten_san_pham: ten,
          ma_san_pham: `SP${String(++counter).padStart(3, '0')}`,
          don_vi_tinh: sizeUnit,
          gia_ban: gia,
          so_luong: getRandomInt(5, 200),
          hinh_anh: getImagePlaceholder(ten),
          danh_muc: cat
        }
      }));
    }
  }

  // If still below 200 due to rounding, add randoms
  while (counter < 200) {
    const cat = CATEGORIES[getRandomInt(0, CATEGORIES.length - 1)];
    const base = extraTemplates[cat][getRandomInt(0, extraTemplates[cat].length - 1)];
    let sizeUnit;
    let amount;
    let unitSuffix;
    if (cat === 'drinks') {
      sizeUnit = ['Chai','Lon'][getRandomInt(0,1)];
      amount = [250, 330, 350, 500, 1000][getRandomInt(0,4)];
      unitSuffix = 'ml';
    } else if (cat === 'household' || cat === 'personalcare') {
      const liquid = /^(nước|nuoc|dầu gội|dau goi|sữa tắm|sua tam)/i.test(base);
      if (liquid) {
        sizeUnit = 'Chai';
        amount = [250, 340, 500, 750, 1000][getRandomInt(0,4)];
        unitSuffix = 'ml';
      } else {
        sizeUnit = ['Hộp','Gói','Túi'][getRandomInt(0,2)];
        amount = [100, 200, 300, 500, 1000][getRandomInt(0,4)];
        unitSuffix = 'g';
      }
    } else {
      sizeUnit = ['Gói','Hộp','Túi'][getRandomInt(0,2)];
      amount = [100,150,200,250,300,400,500,750,1000][getRandomInt(0,8)];
      unitSuffix = 'g';
    }
    let ten = `${base} ${amount}${unitSuffix}`;
    let suffix = 1;
    while (usedNames.has(ten.toLowerCase())) {
      suffix += 1;
      ten = `${base} ${amount}${unitSuffix} - mã ${suffix}`;
    }
    let baseName = extractBaseName(ten);
    if (usedBaseNames.has(baseName)) {
      // try other base
      let attempts = 0;
      let newBase = base;
      while (attempts < 3 && usedBaseNames.has(extractBaseName(newBase))) {
        newBase = extraTemplates[cat][getRandomInt(0, extraTemplates[cat].length - 1)];
        attempts++;
      }
      if (attempts > 0) {
        baseName = extractBaseName(newBase);
        ten = `${newBase} ${amount}${unitSuffix}`;
      } else {
        newBase = `${base} hảo hạng`;
        ten = `${newBase} ${amount}${unitSuffix}`;
        baseName = extractBaseName(newBase);
      }
    }
    usedNames.add(ten.toLowerCase());
    usedBaseNames.add(baseName);
    const gia = getRandomInt(5000, 180000);
    sanPhams.push(await prisma.san_pham.create({
      data: {
        ten_san_pham: ten,
        ma_san_pham: `SP${String(++counter).padStart(3, '0')}`,
        don_vi_tinh: sizeUnit,
        gia_ban: gia,
        so_luong: getRandomInt(5, 200),
        hinh_anh: getImagePlaceholder(ten),
        danh_muc: cat
      }
    }));
  }

    console.log(`Đã thêm ${sanPhams.length} sản phẩm.`);
  } else {
    // Lấy sản phẩm hiện có để tạo phiếu nhập và hóa đơn
    sanPhams = await prisma.san_pham.findMany();
    console.log(`Sử dụng ${sanPhams.length} sản phẩm hiện có.`);
  }

  // --- 3. Thêm 50 nhân viên ---
  let nhanViens = [];
  if (existingProducts.length === 0) {
    // Chỉ tạo nhân viên khi seed đầy đủ
    const hashedPassword = await bcrypt.hash('password123', 10);
    const vaiTros = ['quan_ly', 'thu_ngan', 'nhan_vien_kho'];

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
  } else {
    // Lấy nhân viên hiện có để tạo phiếu nhập và hóa đơn
    nhanViens = await prisma.nhan_vien.findMany();
    console.log(`Sử dụng ${nhanViens.length} nhân viên hiện có.`);
  }

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