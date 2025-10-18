-- CreateTable
CREATE TABLE `giao_dich_ngan_hang` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ma_giao_dich` VARCHAR(100) NOT NULL,
    `ma_don_hang` VARCHAR(50) NOT NULL,
    `so_tien` DECIMAL(10, 2) NOT NULL,
    `ma_xac_minh` VARCHAR(20) NOT NULL,
    `trang_thai` ENUM('cho_xac_nhan', 'da_xac_nhan', 'bi_tu_choi', 'het_han') NOT NULL DEFAULT 'cho_xac_nhan',
    `thoi_gian_tao` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `thoi_gian_het_han` DATETIME(0) NOT NULL,
    `thoi_gian_xac_nhan` DATETIME(0) NULL,
    `nguoi_xac_nhan` VARCHAR(100) NULL,
    `ly_do_tu_choi` TEXT NULL,
    `noi_dung` TEXT NULL,

    UNIQUE INDEX `giao_dich_ngan_hang_ma_giao_dich_key`(`ma_giao_dich`),
    INDEX `giao_dich_ngan_hang_ma_giao_dich_idx`(`ma_giao_dich`),
    INDEX `giao_dich_ngan_hang_ma_don_hang_idx`(`ma_don_hang`),
    INDEX `giao_dich_ngan_hang_trang_thai_idx`(`trang_thai`),
    INDEX `giao_dich_ngan_hang_thoi_gian_tao_idx`(`thoi_gian_tao`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `giao_dich_ngan_hang` ADD CONSTRAINT `giao_dich_ngan_hang_ma_don_hang_fkey` FOREIGN KEY (`ma_don_hang`) REFERENCES `don_hang`(`ma_don_hang`) ON DELETE RESTRICT ON UPDATE CASCADE;
