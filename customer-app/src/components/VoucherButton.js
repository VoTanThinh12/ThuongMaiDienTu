import React, { useState } from 'react';
import { Button, Space, Tag, Tooltip } from 'antd';
import { GiftOutlined, CheckCircleOutlined, CloseOutlined } from '@ant-design/icons';
import VoucherModal from './VoucherModal';

const VoucherButton = ({ onVoucherApplied, appliedVoucher, tongTienGioHang }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleVoucherApplied = (voucherInfo) => {
    onVoucherApplied(voucherInfo);
    setModalVisible(false);
  };

  const handleRemoveVoucher = () => {
    onVoucherApplied(null);
  };

  return (
    <>
      <div className="voucher-button-container">
        {appliedVoucher ? (
          <div className="applied-voucher">
            <Space>
              <Tag 
                color="green" 
                icon={<CheckCircleOutlined />}
                closable
                onClose={handleRemoveVoucher}
                className="applied-voucher-tag"
              >
                {appliedVoucher.voucher.ten_voucher}
              </Tag>
              <span className="voucher-savings">
                Tiết kiệm: {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                }).format(appliedVoucher.so_tien_giam)}
              </span>
            </Space>
          </div>
        ) : (
          <Button
            type="dashed"
            icon={<GiftOutlined />}
            onClick={() => setModalVisible(true)}
            className="voucher-button"
            size="large"
          >
            Nhập mã giảm giá
          </Button>
        )}
      </div>

      <VoucherModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onApplyVoucher={handleVoucherApplied}
        tongTienGioHang={tongTienGioHang}
      />
    </>
  );
};

export default VoucherButton;
