import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Tag, 
  Button, 
  Space, 
  Modal, 
  message, 
  Statistic, 
  Row, 
  Col,
  DatePicker,
  Select,
  Input,
  Tooltip
} from 'antd';
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  CloseCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  FilterOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { bankTransactionAPI } from '../utils/api';
import './BankTransactions.css';

const { RangePicker } = DatePicker;
const { Option } = Select;

const BankTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: null,
    search: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await bankTransactionAPI.getAll(filters);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      message.error('Lỗi tải danh sách giao dịch');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTransaction = async (transactionId) => {
    try {
      await bankTransactionAPI.verify(transactionId);
      message.success('Xác nhận giao dịch thành công');
      fetchTransactions();
    } catch (error) {
      console.error('Error verifying transaction:', error);
      message.error('Lỗi xác nhận giao dịch');
    }
  };

  const handleRejectTransaction = async (transactionId, reason) => {
    try {
      await bankTransactionAPI.reject(transactionId, reason);
      message.success('Từ chối giao dịch thành công');
      fetchTransactions();
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      message.error('Lỗi từ chối giao dịch');
    }
  };

  const showTransactionDetail = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailModalVisible(true);
  };

  const getStatusTag = (status) => {
    const statusConfig = {
      'cho_xac_nhan': { 
        color: 'gold', 
        text: 'Chờ xác nhận', 
        icon: <ClockCircleOutlined /> 
      },
      'da_xac_nhan': { 
        color: 'green', 
        text: 'Đã xác nhận', 
        icon: <CheckCircleOutlined /> 
      },
      'da_tu_choi': { 
        color: 'red', 
        text: 'Đã từ chối', 
        icon: <CloseCircleOutlined /> 
      }
    };
    
    const config = statusConfig[status] || { color: 'default', text: status };
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const columns = [
    {
      title: 'Mã giao dịch',
      dataIndex: 'ma_giao_dich',
      key: 'ma_giao_dich',
      width: 150,
      render: (text) => (
        <code style={{ fontSize: '12px' }}>{text}</code>
      )
    },
    {
      title: 'Mã đơn hàng',
      dataIndex: 'ma_don_hang',
      key: 'ma_don_hang',
      width: 120,
      render: (text) => (
        <code style={{ fontSize: '12px' }}>{text}</code>
      )
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.don_hang?.khach_hang?.ten_khach_hang}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.don_hang?.khach_hang?.so_dien_thoai}
          </div>
        </div>
      )
    },
    {
      title: 'Số tiền',
      dataIndex: 'so_tien',
      key: 'so_tien',
      width: 120,
      align: 'right',
      render: (amount) => (
        <span style={{ fontWeight: 600, color: '#1890ff' }}>
          {formatCurrency(amount)}
        </span>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trang_thai',
      key: 'trang_thai',
      width: 120,
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Thời gian tạo',
      dataIndex: 'thoi_gian_tao',
      key: 'thoi_gian_tao',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
    },
    {
      title: 'Người xác nhận',
      dataIndex: 'nguoi_xac_nhan',
      key: 'nguoi_xac_nhan',
      width: 150,
      render: (text) => text || '-'
    },
    {
      title: 'Hành động',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => showTransactionDetail(record)}
            />
          </Tooltip>
          {record.trang_thai === 'cho_xac_nhan' && (
            <>
              <Button 
                type="primary" 
                size="small"
                onClick={() => handleVerifyTransaction(record.ma_giao_dich)}
              >
                Xác nhận
              </Button>
              <Button 
                danger 
                size="small"
                onClick={() => handleRejectTransaction(record.ma_giao_dich, 'Từ chối thủ công')}
              >
                Từ chối
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  // Thống kê
  const getStatistics = () => {
    const total = transactions.length;
    const pending = transactions.filter(t => t.trang_thai === 'cho_xac_nhan').length;
    const confirmed = transactions.filter(t => t.trang_thai === 'da_xac_nhan').length;
    const rejected = transactions.filter(t => t.trang_thai === 'da_tu_choi').length;
    const totalAmount = transactions
      .filter(t => t.trang_thai === 'da_xac_nhan')
      .reduce((sum, t) => sum + t.so_tien, 0);

    return { total, pending, confirmed, rejected, totalAmount };
  };

  const stats = getStatistics();

  return (
    <div className="bank-transactions">
      <Card title="💳 Quản lý giao dịch ngân hàng" style={{ marginBottom: 16 }}>
        {/* Thống kê */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic 
              title="Tổng giao dịch" 
              value={stats.total} 
              prefix="📊"
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Chờ xác nhận" 
              value={stats.pending} 
              prefix="⏳"
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Đã xác nhận" 
              value={stats.confirmed} 
              prefix="✅"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="Tổng tiền" 
              value={stats.totalAmount} 
              formatter={(value) => formatCurrency(value)}
              prefix="💰"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
        </Row>

        {/* Bộ lọc */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Select
              placeholder="Trạng thái"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              style={{ width: '100%' }}
            >
              <Option value="all">Tất cả</Option>
              <Option value="cho_xac_nhan">Chờ xác nhận</Option>
              <Option value="da_xac_nhan">Đã xác nhận</Option>
              <Option value="da_tu_choi">Đã từ chối</Option>
            </Select>
          </Col>
          <Col span={8}>
            <RangePicker
              placeholder={['Từ ngày', 'Đến ngày']}
              value={filters.dateRange}
              onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={6}>
            <Input
              placeholder="Tìm kiếm mã giao dịch..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </Col>
          <Col span={4}>
            <Space>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchTransactions}
                loading={loading}
              >
                Làm mới
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Bảng giao dịch */}
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} của ${total} giao dịch`
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Modal chi tiết giao dịch */}
      <Modal
        title="Chi tiết giao dịch"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedTransaction && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>Mã giao dịch:</strong>
                  <br />
                  <code>{selectedTransaction.ma_giao_dich}</code>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <strong>Mã đơn hàng:</strong>
                  <br />
                  <code>{selectedTransaction.ma_don_hang}</code>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <strong>Số tiền:</strong>
                  <br />
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#1890ff' }}>
                    {formatCurrency(selectedTransaction.so_tien)}
                  </span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>Trạng thái:</strong>
                  <br />
                  {getStatusTag(selectedTransaction.trang_thai)}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <strong>Mã xác minh:</strong>
                  <br />
                  <code>{selectedTransaction.ma_xac_minh}</code>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <strong>Thời gian tạo:</strong>
                  <br />
                  {dayjs(selectedTransaction.thoi_gian_tao).format('DD/MM/YYYY HH:mm:ss')}
                </div>
              </Col>
            </Row>

            {selectedTransaction.don_hang && (
              <div style={{ marginTop: 20, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                <h4>Thông tin đơn hàng:</h4>
                <Row gutter={16}>
                  <Col span={12}>
                    <div><strong>Khách hàng:</strong> {selectedTransaction.don_hang.khach_hang?.ten_khach_hang}</div>
                    <div><strong>SĐT:</strong> {selectedTransaction.don_hang.khach_hang?.so_dien_thoai}</div>
                  </Col>
                  <Col span={12}>
                    <div><strong>Địa chỉ:</strong> {selectedTransaction.don_hang.dia_chi_giao_hang}</div>
                    <div><strong>Ghi chú:</strong> {selectedTransaction.don_hang.ghi_chu || 'Không có'}</div>
                  </Col>
                </Row>
              </div>
            )}

            {selectedTransaction.trang_thai === 'cho_xac_nhan' && (
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <Space>
                  <Button 
                    type="primary" 
                    onClick={() => {
                      handleVerifyTransaction(selectedTransaction.ma_giao_dich);
                      setDetailModalVisible(false);
                    }}
                  >
                    Xác nhận giao dịch
                  </Button>
                  <Button 
                    danger
                    onClick={() => {
                      handleRejectTransaction(selectedTransaction.ma_giao_dich, 'Từ chối thủ công');
                      setDetailModalVisible(false);
                    }}
                  >
                    Từ chối giao dịch
                  </Button>
                </Space>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BankTransactions;







