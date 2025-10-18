import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, message, Card, Tag, Space, Divider, Spin } from 'antd';
import { GiftOutlined, CheckCircleOutlined, ClockCircleOutlined, DollarOutlined } from '@ant-design/icons';
import { storefrontAPI } from '../utils/api';
import './VoucherModal.css';

const VoucherModal = ({ visible, onClose, onApplyVoucher, tongTienGioHang }) => {
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherInfo, setVoucherInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [popularVouchers, setPopularVouchers] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchPopularVouchers();
    }
  }, [visible]);

  const fetchPopularVouchers = async () => {
    setLoadingPopular(true);
    try {
      const response = await storefrontAPI.get('/voucher/popular');
      setPopularVouchers(response.data.data || []);
    } catch (error) {
      console.error('Fetch popular vouchers error:', error);
    } finally {
      setLoadingPopular(false);
    }
  };

  const handleCheckVoucher = async () => {
    if (!voucherCode.trim()) {
      message.warning('Vui lòng nhập mã voucher');
      return;
    }

    setLoading(true);
    try {
      const response = await storefrontAPI.post('/voucher/apply', {
        ma_voucher: voucherCode,
        tong_tien_gio_hang: tongTienGioHang
      });

      if (response.data.success) {
        setVoucherInfo(response.data.data);
        message.success('Voucher hợp lệ!');
      }
    } catch (error) {
      console.error('Check voucher error:', error);
      message.error(error.response?.data?.message || 'Voucher không hợp lệ');
      setVoucherInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyVoucher = () => {
    if (voucherInfo) {
      onApplyVoucher(voucherInfo);
      onClose();
      message.success('Áp dụng voucher thành công!');
    }
  };

  const handleSelectPopularVoucher = (voucher) => {
    setVoucherCode(voucher.ma_voucher);
    setVoucherInfo(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GiftOutlined style={{ color: '#ff6b6b' }} />
          <span>Mã giảm giá</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      className="voucher-modal"
    >
      <div className="voucher-modal-content">
        {/* Nhập mã voucher */}
        <div className="voucher-input-section">
          <h3>Nhập mã voucher</h3>
          <div className="voucher-input-group">
            <Input
              placeholder="Nhập mã voucher của bạn"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              onPressEnter={handleCheckVoucher}
              size="large"
              className="voucher-input"
            />
            <Button
              type="primary"
              onClick={handleCheckVoucher}
              loading={loading}
              size="large"
              className="voucher-check-btn"
            >
              Kiểm tra
            </Button>
          </div>
        </div>

        {/* Thông tin voucher */}
        {voucherInfo && (
          <Card className="voucher-info-card">
            <div className="voucher-info-header">
              <div className="voucher-info-title">
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                <span>{voucherInfo.voucher.ten_voucher}</span>
              </div>
              <Tag color="green">Hợp lệ</Tag>
            </div>
            
            <div className="voucher-info-content">
              <div className="voucher-discount-info">
                <div className="discount-amount">
                  <DollarOutlined style={{ color: '#ff6b6b' }} />
                  <span className="discount-text">
                    Giảm {voucherInfo.voucher.loai_giam_gia === 'phan_tram' 
                      ? `${voucherInfo.voucher.gia_tri_giam}%` 
                      : formatCurrency(voucherInfo.voucher.gia_tri_giam)
                    }
                  </span>
                </div>
                <div className="savings-info">
                  <span>Tiết kiệm: </span>
                  <span className="savings-amount">{formatCurrency(voucherInfo.so_tien_giam)}</span>
                </div>
              </div>

              <Divider />

              <div className="voucher-summary">
                <div className="summary-row">
                  <span>Tổng tiền gốc:</span>
                  <span>{formatCurrency(tongTienGioHang)}</span>
                </div>
                <div className="summary-row discount-row">
                  <span>Giảm giá:</span>
                  <span>-{formatCurrency(voucherInfo.so_tien_giam)}</span>
                </div>
                <div className="summary-row total-row">
                  <span>Tổng thanh toán:</span>
                  <span>{formatCurrency(voucherInfo.tong_tien_sau_giam)}</span>
                </div>
              </div>

              <Button
                type="primary"
                size="large"
                onClick={handleApplyVoucher}
                loading={applying}
                className="apply-voucher-btn"
                block
              >
                Áp dụng voucher
              </Button>
            </div>
          </Card>
        )}

        {/* Voucher phổ biến */}
        <div className="popular-vouchers-section">
          <h3>Voucher phổ biến</h3>
          {loadingPopular ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin />
            </div>
          ) : (
            <div className="popular-vouchers-grid">
              {popularVouchers.map((voucher) => (
                <Card
                  key={voucher.id}
                  className="popular-voucher-card"
                  onClick={() => handleSelectPopularVoucher(voucher)}
                  hoverable
                >
                  <div className="popular-voucher-content">
                    <div className="popular-voucher-title">
                      {voucher.ten_voucher}
                    </div>
                    <div className="popular-voucher-code">
                      {voucher.ma_voucher}
                    </div>
                    <div className="popular-voucher-discount">
                      Giảm {voucher.loai_giam_gia === 'phan_tram' 
                        ? `${voucher.gia_tri_giam}%` 
                        : formatCurrency(voucher.gia_tri_giam)
                      }
                    </div>
                    <div className="popular-voucher-expiry">
                      <ClockCircleOutlined />
                      <span>HSD: {formatDate(voucher.ngay_ket_thuc)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default VoucherModal;
