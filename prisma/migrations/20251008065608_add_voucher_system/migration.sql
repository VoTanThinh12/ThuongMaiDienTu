-- CreateTable
CREATE TABLE `voucher` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ma_voucher` VARCHAR(50) NOT NULL,
    `ten_voucher` VARCHAR(100) NOT NULL,
    `mo_ta` TEXT NULL,
    `loai_giam_gia` ENUM('phan_tram', 'tien_mat') NOT NULL DEFAULT 'phan_tram',
    `gia_tri_giam` DECIMAL(10, 2) NOT NULL,
    `gia_tri_toi_thieu` DECIMAL(10, 2) NULL,
    `gia_tri_toi_da` DECIMAL(10, 2) NULL,
    `so_luong` INTEGER NOT NULL DEFAULT 1,
    `so_luong_da_dung` INTEGER NOT NULL DEFAULT 0,
    `ngay_bat_dau` DATETIME(0) NOT NULL,
    `ngay_ket_thuc` DATETIME(0) NOT NULL,
    `trang_thai` ENUM('hoat_dong', 'tam_dung', 'het_han', 'het_luong') NOT NULL DEFAULT 'hoat_dong',
    `ngay_tao` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `ngay_cap_nhat` DATETIME(0) NOT NULL,

    UNIQUE INDEX `voucher_ma_voucher_key`(`ma_voucher`),
    INDEX `voucher_ma_voucher_idx`(`ma_voucher`),
    INDEX `voucher_trang_thai_idx`(`trang_thai`),
    INDEX `voucher_ngay_bat_dau_idx`(`ngay_bat_dau`),
    INDEX `voucher_ngay_ket_thuc_idx`(`ngay_ket_thuc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `su_dung_voucher` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_voucher` INTEGER NOT NULL,
    `id_don_hang` INTEGER NOT NULL,
    `id_khach_hang` INTEGER NOT NULL,
    `so_tien_giam` DECIMAL(10, 2) NOT NULL,
    `ngay_su_dung` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `su_dung_voucher_id_voucher_idx`(`id_voucher`),
    INDEX `su_dung_voucher_id_don_hang_idx`(`id_don_hang`),
    INDEX `su_dung_voucher_id_khach_hang_idx`(`id_khach_hang`),
    UNIQUE INDEX `su_dung_voucher_id_don_hang_key`(`id_don_hang`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `su_dung_voucher` ADD CONSTRAINT `su_dung_voucher_id_voucher_fkey` FOREIGN KEY (`id_voucher`) REFERENCES `voucher`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `su_dung_voucher` ADD CONSTRAINT `su_dung_voucher_id_don_hang_fkey` FOREIGN KEY (`id_don_hang`) REFERENCES `don_hang`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `su_dung_voucher` ADD CONSTRAINT `su_dung_voucher_id_khach_hang_fkey` FOREIGN KEY (`id_khach_hang`) REFERENCES `khach_hang`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
