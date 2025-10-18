-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chi_tiet_hoa_don_ban` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_hoa_don` INTEGER NULL,
    `id_san_pham` INTEGER NULL,
    `so_luong` INTEGER NULL,
    `don_gia` DECIMAL(10, 2) NULL,

    INDEX `id_hoa_don`(`id_hoa_don`),
    INDEX `id_san_pham`(`id_san_pham`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chi_tiet_phieu_nhap` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_phieu_nhap` INTEGER NULL,
    `id_san_pham` INTEGER NULL,
    `so_luong_nhap` INTEGER NULL,
    `gia_nhap` DECIMAL(10, 2) NULL,

    INDEX `id_phieu_nhap`(`id_phieu_nhap`),
    INDEX `id_san_pham`(`id_san_pham`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hoa_don_ban` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_nhan_vien` INTEGER NULL,
    `ngay_ban` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `tong_tien` DECIMAL(10, 2) NULL,

    INDEX `id_nhan_vien`(`id_nhan_vien`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nha_cung_cap` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ten_nha_cung_cap` VARCHAR(100) NULL,
    `so_dien_thoai` VARCHAR(15) NULL,
    `dia_chi` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nhan_vien` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ho_ten` VARCHAR(100) NOT NULL,
    `tai_khoan` VARCHAR(50) NOT NULL,
    `mat_khau` VARCHAR(100) NOT NULL,
    `vai_tro` ENUM('quan_ly', 'thu_ngan', 'nhan_vien_kho') NOT NULL DEFAULT 'quan_ly',
    `trang_thai` ENUM('Đang làm', 'Đã nghỉ') NOT NULL DEFAULT 'Đang làm',
    `so_dien_thoai` VARCHAR(15) NULL,
    `dia_chi` TEXT NULL,
    `email` VARCHAR(191) NULL,
    `ngay_sinh` DATE NULL,
    `ngay_vao_lam` DATE NULL,

    UNIQUE INDEX `nhan_vien_tai_khoan_key`(`tai_khoan`),
    UNIQUE INDEX `nhan_vien_email_key`(`email`),
    INDEX `tai_khoan`(`tai_khoan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `phieu_nhap` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_nha_cung_cap` INTEGER NULL,
    `ngay_nhap` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `id_nhan_vien` INTEGER NULL,

    INDEX `id_nha_cung_cap`(`id_nha_cung_cap`),
    INDEX `id_nhan_vien`(`id_nhan_vien`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `san_pham` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ten_san_pham` VARCHAR(100) NULL,
    `ma_san_pham` VARCHAR(50) NULL,
    `don_vi_tinh` VARCHAR(50) NULL,
    `gia_ban` DECIMAL(10, 2) NULL,
    `so_luong` INTEGER NULL DEFAULT 0,
    `ngay_tao` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `ma_san_pham`(`ma_san_pham`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `khach_hang` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(100) NOT NULL,
    `mat_khau` VARCHAR(255) NOT NULL,
    `ho_ten` VARCHAR(100) NOT NULL,
    `so_dien_thoai` VARCHAR(15) NULL,
    `ngay_tao` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `trang_thai` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `khach_hang_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dia_chi_khach` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_khach_hang` INTEGER NOT NULL,
    `ho_ten_nguoi_nhan` VARCHAR(100) NOT NULL,
    `so_dien_thoai` VARCHAR(15) NOT NULL,
    `dia_chi_chi_tiet` TEXT NOT NULL,
    `phuong_xa` VARCHAR(100) NULL,
    `quan_huyen` VARCHAR(100) NULL,
    `tinh_thanh` VARCHAR(100) NULL,
    `mac_dinh` BOOLEAN NOT NULL DEFAULT false,

    INDEX `dia_chi_khach_id_khach_hang_idx`(`id_khach_hang`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gio_hang` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_khach_hang` INTEGER NOT NULL,
    `id_san_pham` INTEGER NOT NULL,
    `so_luong` INTEGER NOT NULL,
    `ngay_them` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `gio_hang_id_khach_hang_idx`(`id_khach_hang`),
    INDEX `gio_hang_id_san_pham_idx`(`id_san_pham`),
    UNIQUE INDEX `gio_hang_id_khach_hang_id_san_pham_key`(`id_khach_hang`, `id_san_pham`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `don_hang` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ma_don_hang` VARCHAR(50) NOT NULL,
    `id_khach_hang` INTEGER NOT NULL,
    `tong_tien` DECIMAL(10, 2) NOT NULL,
    `trang_thai` ENUM('cho_xac_nhan', 'da_xac_nhan', 'dang_giao', 'da_giao', 'da_huy') NOT NULL DEFAULT 'cho_xac_nhan',
    `phuong_thuc_thanh_toan` VARCHAR(50) NOT NULL,
    `trang_thai_thanh_toan` BOOLEAN NOT NULL DEFAULT false,
    `dia_chi_giao_hang` TEXT NOT NULL,
    `ho_ten_nguoi_nhan` VARCHAR(100) NOT NULL,
    `so_dien_thoai` VARCHAR(15) NOT NULL,
    `ghi_chu` TEXT NULL,
    `ngay_tao` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `ngay_cap_nhat` DATETIME(0) NOT NULL,

    UNIQUE INDEX `don_hang_ma_don_hang_key`(`ma_don_hang`),
    INDEX `don_hang_id_khach_hang_idx`(`id_khach_hang`),
    INDEX `don_hang_ma_don_hang_idx`(`ma_don_hang`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chi_tiet_don_hang` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_don_hang` INTEGER NOT NULL,
    `id_san_pham` INTEGER NOT NULL,
    `ten_san_pham` VARCHAR(100) NOT NULL,
    `so_luong` INTEGER NOT NULL,
    `don_gia` DECIMAL(10, 2) NOT NULL,

    INDEX `chi_tiet_don_hang_id_don_hang_idx`(`id_don_hang`),
    INDEX `chi_tiet_don_hang_id_san_pham_idx`(`id_san_pham`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `chi_tiet_hoa_don_ban` ADD CONSTRAINT `chi_tiet_hoa_don_ban_ibfk_1` FOREIGN KEY (`id_hoa_don`) REFERENCES `hoa_don_ban`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chi_tiet_hoa_don_ban` ADD CONSTRAINT `chi_tiet_hoa_don_ban_ibfk_2` FOREIGN KEY (`id_san_pham`) REFERENCES `san_pham`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chi_tiet_phieu_nhap` ADD CONSTRAINT `chi_tiet_phieu_nhap_ibfk_1` FOREIGN KEY (`id_phieu_nhap`) REFERENCES `phieu_nhap`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chi_tiet_phieu_nhap` ADD CONSTRAINT `chi_tiet_phieu_nhap_ibfk_2` FOREIGN KEY (`id_san_pham`) REFERENCES `san_pham`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hoa_don_ban` ADD CONSTRAINT `hoa_don_ban_ibfk_1` FOREIGN KEY (`id_nhan_vien`) REFERENCES `nhan_vien`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `phieu_nhap` ADD CONSTRAINT `phieu_nhap_ibfk_1` FOREIGN KEY (`id_nha_cung_cap`) REFERENCES `nha_cung_cap`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `phieu_nhap` ADD CONSTRAINT `phieu_nhap_ibfk_2` FOREIGN KEY (`id_nhan_vien`) REFERENCES `nhan_vien`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dia_chi_khach` ADD CONSTRAINT `dia_chi_khach_id_khach_hang_fkey` FOREIGN KEY (`id_khach_hang`) REFERENCES `khach_hang`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gio_hang` ADD CONSTRAINT `gio_hang_id_khach_hang_fkey` FOREIGN KEY (`id_khach_hang`) REFERENCES `khach_hang`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gio_hang` ADD CONSTRAINT `gio_hang_id_san_pham_fkey` FOREIGN KEY (`id_san_pham`) REFERENCES `san_pham`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `don_hang` ADD CONSTRAINT `don_hang_id_khach_hang_fkey` FOREIGN KEY (`id_khach_hang`) REFERENCES `khach_hang`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chi_tiet_don_hang` ADD CONSTRAINT `chi_tiet_don_hang_id_don_hang_fkey` FOREIGN KEY (`id_don_hang`) REFERENCES `don_hang`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chi_tiet_don_hang` ADD CONSTRAINT `chi_tiet_don_hang_id_san_pham_fkey` FOREIGN KEY (`id_san_pham`) REFERENCES `san_pham`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
