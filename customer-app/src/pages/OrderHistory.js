import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Empty, Tag, Spin, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { orderAPI } from '../utils/api';
import './OrderHistory.css';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await orderAPI.getMyOrders();
      setOrders(response.data);
    } catch (error) {
      console.error('Fetch orders error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      'cho_xac_nhan': { color: 'gold', text: 'Chờ xác nhận' },
      'da_xac_nhan': { color: 'blue', text: 'Đã xác nhận' },
      'dang_giao': { color: 'cyan', text: 'Đang giao hàng' },
      'hoan_thanh': { color: 'green', text: 'Hoàn thành' },
      'da_huy': { color: 'red', text: 'Đã hủy' }
    };
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'cod':
        return 'Thanh toán khi nhận hàng';
      case 'bank_transfer':
        return 'Chuyển khoản ngân hàng';
      case 'momo':
        return 'Ví MoMo';
      case 'stripe':
        return 'Thẻ quốc tế (Stripe)';
      default:
        return method || 'Không xác định';
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="order-history-page">
        <Card>
          <Empty
            description="Chưa có đơn hàng nào"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate('/products')}>
              Bắt đầu mua sắm
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  return (
    <div className="order-history-page">
      <h1>Lịch sử đơn hàng</h1>

      <div className="orders-list">
        {orders.map(order => (
          <Card key={order.id} className="order-card">
            <div className="order-header">
              <div className="order-id">
                <strong>Đơn hàng #{order.ma_don_hang}</strong>
                <span className="order-date">
                  {dayjs(order.ngay_tao).format('DD/MM/YYYY HH:mm')}
                </span>
              </div>
              <div>{getStatusTag(order.trang_thai)}</div>
            </div>

            <div className="order-info">
              <div className="order-info-row">
                <span className="order-label">Người nhận:</span>
                <span>{order.ho_ten_nguoi_nhan}</span>
              </div>
              <div className="order-info-row">
                <span className="order-label">Số điện thoại:</span>
                <span>{order.so_dien_thoai}</span>
              </div>
              <div className="order-info-row">
                <span className="order-label">Địa chỉ:</span>
                <span>{order.dia_chi_giao_hang}</span>
              </div>
              <div className="order-info-row">
                <span className="order-label">Phương thức thanh toán:</span>
                <span>{getPaymentMethodText(order.phuong_thuc_thanh_toan)}</span>
              </div>
            </div>

            <div className="order-footer">
              <div className="order-total">
                Tổng tiền: <strong>{formatCurrency(order.tong_tien)}</strong>
              </div>
              <Button 
                type="primary" 
                icon={<EyeOutlined />}
                onClick={() => navigate(`/orders/${order.id}`)}
              >
                Xem chi tiết
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OrderHistory;