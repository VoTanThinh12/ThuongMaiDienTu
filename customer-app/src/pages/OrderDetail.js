import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Spin, Empty, Button, Table, Space, Modal, message } from 'antd';
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { orderAPI } from '../utils/api';
import EditOrderModal from '../components/EditOrderModal';
import './OrderDetail.css';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const fetchOrderDetail = async () => {
    try {
      const response = await orderAPI.getOrderDetail(id);
      setOrder(response.data);
    } catch (error) {
      console.error('Fetch order detail error:', error);
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
    const methods = {
      'cod': 'Thanh toán khi nhận hàng (COD)',
      'bank_transfer': 'Chuyển khoản ngân hàng',
      'vnpay': 'VNPay',
      'momo': 'MoMo'
    };
    return methods[method] || method;
  };

  const handleEditOrder = () => {
    setEditModalVisible(true);
  };

  const handleCancelOrder = () => {
    Modal.confirm({
      title: 'Xác nhận hủy đơn hàng',
      content: 'Bạn có chắc chắn muốn hủy đơn hàng này?',
      okText: 'Hủy đơn hàng',
      okType: 'danger',
      cancelText: 'Không',
      onOk: async () => {
        try {
          await orderAPI.cancelOrder(id);
          message.success('Hủy đơn hàng thành công!');
          fetchOrderDetail(); // Refresh data
        } catch (error) {
          message.error(error.response?.data?.error || 'Hủy đơn hàng thất bại!');
        }
      }
    });
  };

  const handleEditSuccess = () => {
    fetchOrderDetail(); // Refresh data
  };

  const canEditOrder = () => {
    return order && ['cho_xac_nhan', 'da_xac_nhan'].includes(order.trang_thai);
  };

  const canCancelOrder = () => {
    return order && ['cho_xac_nhan', 'da_xac_nhan'].includes(order.trang_thai);
  };

  const columns = [
    {
      title: 'Sản phẩm',
      dataIndex: ['san_pham', 'ten_san_pham'],
      key: 'ten_san_pham',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ color: '#999', fontSize: 12 }}>
            Mã: {record.san_pham.ma_san_pham}
          </div>
        </div>
      ),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'don_gia',
      key: 'don_gia',
      align: 'right',
      render: (price) => formatCurrency(price),
    },
    {
      title: 'Số lượng',
      dataIndex: 'so_luong',
      key: 'so_luong',
      align: 'center',
    },
    {
      title: 'Thành tiền',
      key: 'thanh_tien',
      align: 'right',
      render: (_, record) => formatCurrency(record.don_gia * record.so_luong),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-detail-page">
        <Empty description="Không tìm thấy đơn hàng" />
      </div>
    );
  }

  return (
    <div className="order-detail-page">
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/orders')}
        style={{ marginBottom: 24 }}
      >
        Quay lại danh sách
      </Button>

      <Card 
        title={`Chi tiết đơn hàng #${order.id}`}
        extra={
          <Space>
            {getStatusTag(order.trang_thai)}
            {canEditOrder() && (
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={handleEditOrder}
              >
                Chỉnh sửa
              </Button>
            )}
            {canCancelOrder() && (
              <Button 
                danger 
                icon={<DeleteOutlined />}
                onClick={handleCancelOrder}
              >
                Hủy đơn hàng
              </Button>
            )}
          </Space>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Ngày đặt hàng" span={2}>
            {dayjs(order.ngay_tao).format('DD/MM/YYYY HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="Người nhận">
            {order.ho_ten_nguoi_nhan}
          </Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">
            {order.so_dien_thoai}
          </Descriptions.Item>
          <Descriptions.Item label="Địa chỉ giao hàng" span={2}>
            {order.dia_chi_giao_hang}
          </Descriptions.Item>
          {order.ghi_chu && (
            <Descriptions.Item label="Ghi chú" span={2}>
              {order.ghi_chu}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Phương thức thanh toán" span={2}>
            {getPaymentMethodText(order.phuong_thuc_thanh_toan)}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Sản phẩm" style={{ marginTop: 24 }}>
        <Table
          columns={columns}
          dataSource={order.chi_tiet_don_hang}
          rowKey="id"
          pagination={false}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={3} align="right">
                  <strong style={{ fontSize: 18 }}>Tổng cộng:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell align="right">
                  <strong style={{ fontSize: 20, color: '#52c41a' }}>
                    {formatCurrency(order.tong_tien)}
                  </strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>

      <EditOrderModal
        order={order}
        visible={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default OrderDetail;