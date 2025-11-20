import React, { memo, useState, useEffect, useCallback } from 'react';
import { 
  Table, Button, Modal, Form, Input, InputNumber, message,
  Space, Card, Dropdown, Tag, Switch
} from 'antd';
import { 
  PlusOutlined, EditOutlined, ShoppingOutlined, SearchOutlined,
  MoreOutlined, EyeInvisibleOutlined, StopOutlined, UndoOutlined, EyeOutlined
} from '@ant-design/icons';
import api from '../utils/api';
// import MainLayout from '../components/MainLayout';

const ProductManagement = memo(() => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showHiddenProducts, setShowHiddenProducts] = useState(false);
  const [form] = Form.useForm();

  const fetchProducts = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.error('Bạn cần đăng nhập để xem danh sách sản phẩm!');
      return;
    }
//heheh
    setLoading(true);
    try {
      const params = showHiddenProducts ? { include_hidden: 'true' } : {};
      console.log('Fetching products with params:', params, 'showHiddenProducts:', showHiddenProducts);
      const response = await api.get('/sanpham', { params });
      console.log('Products fetched:', response.data.length, 'products');
      const sorted = (response.data || []).slice().sort((a, b) => {
        // Ưu tiên sắp xếp mới nhất lên đầu theo id giảm dần; fallback theo ngay_tao nếu có
        if (a?.id != null && b?.id != null) return b.id - a.id;
        if (a?.ngay_tao && b?.ngay_tao) return new Date(b.ngay_tao) - new Date(a.ngay_tao);
        return 0;
      });
      setProducts(sorted);
      setFilteredProducts(sorted);
    } catch (error) {
      console.error('Fetch products error:', error);
      message.error(error.response?.data?.error || 'Lỗi khi tải danh sách sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [showHiddenProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Hàm tìm kiếm sản phẩm
  const handleSearch = useCallback((value) => {
    setSearchText(value);
    if (!value.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.ten_san_pham.toLowerCase().includes(value.toLowerCase().trim()) ||
        product.ma_san_pham.toLowerCase().includes(value.toLowerCase().trim()) ||
        (product.don_vi_tinh && product.don_vi_tinh.toLowerCase().includes(value.toLowerCase().trim()))
      );
      setFilteredProducts(filtered);
    }
  }, [products]);

  // Reset search khi products thay đổi
  useEffect(() => {
    handleSearch(searchText);
  }, [products, handleSearch, searchText]);

  const handleAdd = useCallback(() => {
    setEditingProduct(null);
    setIsModalVisible(true);
    form.resetFields();
  }, [form]);

  const handleEdit = useCallback((record) => {
    setEditingProduct(record);
    setIsModalVisible(true);
    form.setFieldsValue({
      ...record,
      gia_ban: parseFloat(record.gia_ban),
      so_luong: parseInt(record.so_luong),
    });
  }, [form]);

  const handleSoftDelete = useCallback(async (id, trang_thai) => {
    try {
      await api.delete(`/sanpham/${id}`, { data: { trang_thai } });
      const statusMessage = trang_thai === 'AN' ? 'ẩn' : 'ngừng kinh doanh';
      message.success(`Sản phẩm đã ${statusMessage} thành công!`);
      fetchProducts();
    } catch (error) {
      console.error('Soft delete product error:', error);
      message.error(error.response?.data?.error || 'Lỗi khi cập nhật trạng thái sản phẩm.');
    }
  }, [fetchProducts]);

  const handleRestore = useCallback(async (id) => {
    try {
      await api.patch(`/sanpham/${id}/restore`);
      message.success('Khôi phục sản phẩm thành công!');
      fetchProducts();
    } catch (error) {
      console.error('Restore product error:', error);
      message.error(error.response?.data?.error || 'Lỗi khi khôi phục sản phẩm.');
    }
  }, [fetchProducts]);

  const handleOk = useCallback(async () => {
    try {
      const values = await form.validateFields();
      
      if (editingProduct) {
        await api.put(`/sanpham/${editingProduct.id}`, values);
        message.success('Cập nhật sản phẩm thành công!');
      } else {
        await api.post('/sanpham', values);
        message.success('Thêm sản phẩm thành công!');
      }
      
      setIsModalVisible(false);
      form.resetFields();
      fetchProducts();
    } catch (error) {
      console.error('Save product error:', error);
      message.error(error.response?.data?.error || 'Lỗi khi lưu sản phẩm.');
    }
  }, [form, editingProduct, fetchProducts]);

  const handleCancel = useCallback(() => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingProduct(null);
  }, [form]);

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }, []);

  const getStatusTag = useCallback((trang_thai) => {
    const statusConfig = {
      'DANG_KINH_DOANH': { color: 'green', text: 'Đang kinh doanh', icon: '🟢' },
      'NGUNG_KINH_DOANH': { color: 'orange', text: 'Ngừng kinh doanh', icon: '🟡' },
      'AN': { color: 'red', text: 'Ẩn', icon: '🔴' }
    };
    
    const config = statusConfig[trang_thai] || statusConfig['DANG_KINH_DOANH'];
    
    return (
      <Tag 
        color={config.color} 
        style={{ 
          fontWeight: 'bold',
          borderRadius: '6px',
          padding: '4px 8px',
          fontSize: '12px'
        }}
      >
        {config.icon} {config.text}
      </Tag>
    );
  }, []);

  // Hàm highlight text tìm kiếm với style đẹp
  const highlightText = useCallback((text, searchValue) => {
    if (!searchValue || !text) return text;
    
    const regex = new RegExp(`(${searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.toString().split(regex).map((part, index) =>
      regex.test(part) ? (
        <span 
          key={index} 
          style={{ 
            background: 'linear-gradient(135deg, #fff2e6 0%, #ffe7ba 100%)',
            color: '#d46b08',
            fontWeight: 'bold',
            padding: '2px 4px',
            borderRadius: '4px',
            border: '1px solid #ffd591',
            boxShadow: '0 1px 3px rgba(212, 107, 8, 0.2)',
            fontSize: '13px'
          }}
        >
          {part}
        </span>
      ) : part
    );
  }, []);

  const columns = [
    {
      title: 'Mã sản phẩm',
      dataIndex: 'ma_san_pham',
      key: 'ma_san_pham',
      width: 120,
      render: (text) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
          {highlightText(text, searchText)}
        </span>
      )
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'ten_san_pham',
      key: 'ten_san_pham',
      ellipsis: true,
      render: (text) => highlightText(text, searchText)
    },
    {
      title: 'Đơn vị tính',
      dataIndex: 'don_vi_tinh',
      key: 'don_vi_tinh',
      width: 100,
      align: 'center',
      render: (text) => highlightText(text, searchText)
    },
    {
      title: 'Giá bán',
      dataIndex: 'gia_ban',
      key: 'gia_ban',
      width: 140,
      align: 'right',
      sorter: (a, b) => a.gia_ban - b.gia_ban,
      render: (price) => (
        <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
          {formatCurrency(price)}
        </span>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'so_luong',
      key: 'so_luong',
      width: 100,
      align: 'center',
      sorter: (a, b) => a.so_luong - b.so_luong,
      render: (quantity) => (
        <span style={{ 
          fontWeight: 'bold',
          color: quantity > 0 ? '#1890ff' : '#ff4d4f' 
        }}>
          {quantity}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trang_thai',
      key: 'trang_thai',
      width: 140,
      align: 'center',
      render: (trang_thai) => getStatusTag(trang_thai || 'DANG_KINH_DOANH'),
    },
    {
      title: '',
      key: 'action',
      width: 180,
      align: 'center',
      render: (_, record) => {
        // Xử lý trường hợp sản phẩm chưa có trạng thái (mặc định là đang kinh doanh)
        const trang_thai = record.trang_thai || 'DANG_KINH_DOANH';
        const isActive = trang_thai === 'DANG_KINH_DOANH';
        
        const actionItems = [];

        if (isActive) {
          // Sản phẩm đang kinh doanh - hiển thị các tùy chọn ngừng kinh doanh và ẩn
          actionItems.push(
            {
              key: 'stop',
              label: 'Ngừng kinh doanh',
              icon: <StopOutlined/>,
              onClick: () => handleSoftDelete(record.id, 'NGUNG_KINH_DOANH'),
            },
            {
              key: 'hide',
              label: 'Ẩn sản phẩm',
              icon: <EyeInvisibleOutlined />,
              onClick: () => handleSoftDelete(record.id, 'AN'),
            }
          );
        } else {
          // Sản phẩm đã ngừng kinh doanh hoặc ẩn - hiển thị tùy chọn khôi phục
          actionItems.push({
            key: 'restore',
            label: 'Khôi phục',
            icon: <UndoOutlined />,
            onClick: () => handleRestore(record.id),
          });
        }

        return (
          <Space size="small">
            <Button 
              type="primary" 
              ghost 
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              Sửa
            </Button>
            {actionItems.length > 0 && (
              <Dropdown
                menu={{ items: actionItems }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button size="small" icon={<MoreOutlined />}>
                  {isActive ? 'Tùy chọn' : 'Khôi phục'}
                </Button>
              </Dropdown>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px',
        backgroundColor: '#fff',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
        border: '1px solid #f0f0f0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginBottom: '24px',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShoppingOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <h2 style={{ margin: 0, fontSize: '24px', color: '#262626' }}>Quản lý Sản phẩm</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Input.Search
                placeholder="🛍️ Tìm kiếm..."
                allowClear
                enterButton={
                  <Button 
                    type="primary" 
                    icon={<SearchOutlined />}
                    style={{
                      background: 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)'
                    }}
                  >
                    Tìm kiếm
                  </Button>
                }
                size="large"
                style={{ 
                  width: 450,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  borderRadius: '8px'
                }}
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                onSearch={handleSearch}
                className="custom-search-input"
              />
              {searchText && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #d9d9d9',
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#666',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  zIndex: 10
                }}>
                  🛍️ <strong>{filteredProducts.length}</strong> kết quả tìm thấy cho "{searchText}"
                </div>
              )}
            </div>
            
            {/* Switch hiển thị sản phẩm ẩn */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: '8px',
              border: '1px solid #bae6fd',
              boxShadow: '0 2px 8px rgba(14, 165, 233, 0.1)'
            }}>
              <EyeOutlined style={{ color: '#0ea5e9', fontSize: '16px' }} />
              <span style={{ 
                fontSize: '13px', 
                fontWeight: 'bold', 
                color: '#0c4a6e',
                whiteSpace: 'nowrap'
              }}>
                Hiển thị sản phẩm bị ẩn và ngừng kinh doanh 
              </span>
              <Switch
                checked={showHiddenProducts}
                onChange={(checked) => {
                  setShowHiddenProducts(checked);
                  // fetchProducts sẽ được gọi tự động thông qua useEffect dependency
                }}
                size="small"
                style={{
                  background: showHiddenProducts ? '#0ea5e9' : '#cbd5e1'
                }}
              />
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={handleAdd}
              style={{
                background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)',
                borderRadius: '8px',
                height: '48px',
                padding: '0 24px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(82, 196, 26, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(82, 196, 26, 0.3)';
              }}
            >
              ✨ Thêm Sản phẩm
            </Button>
          </div>
        </div>

        <Card style={{
          borderRadius: '16px',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.06)',
          border: '1px solid #f0f2f5',
          background: 'linear-gradient(135deg, #ffffff 0%, #fafbff 100%)'
        }}>
          {/* Hiển thị thông tin tìm kiếm đẹp */}
          {searchText && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '16px 20px', 
              background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)', 
              borderRadius: '12px',
              border: '1px solid #91d5ff',
              boxShadow: '0 2px 8px rgba(24, 144, 255, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #1890ff 0%, #36cfc9 100%)'
              }} />
              <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)'
                  }}>
                    <SearchOutlined style={{ color: 'white', fontSize: '16px' }} />
                  </div>
                  <div>
                    <div style={{ 
                      color: '#1890ff', 
                      fontWeight: 'bold', 
                      fontSize: '15px',
                      marginBottom: '2px'
                    }}>
                      🛍️ Tìm kiếm: "{searchText}"
                    </div>
                    <div style={{ 
                      color: '#666', 
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        background: filteredProducts.length > 0 ? '#52c41a' : '#ff4d4f',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {filteredProducts.length} kết quả
                      </span>
                      <span>trong {products.length} sản phẩm</span>
                      {showHiddenProducts && (
                        <span style={{
                          background: '#f59e0b',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          marginLeft: '8px'
                        }}>
                          Bao gồm sản phẩm ẩn
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  type="text"
                  size="small" 
                  onClick={() => handleSearch('')}
                  style={{ 
                    color: '#1890ff',
                    fontWeight: 'bold',
                    border: '1px solid #91d5ff',
                    borderRadius: '6px',
                    padding: '4px 12px',
                    height: 'auto',
                    background: 'white',
                    boxShadow: '0 1px 4px rgba(24, 144, 255, 0.2)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#1890ff';
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.color = '#1890ff';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  ✖️ Xóa bộ lọc
                </Button>
              </Space>
            </div>
          )}
          <Table 
            columns={columns} 
            dataSource={filteredProducts} 
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} của ${total} sản phẩm`,
            }}
            locale={{
              emptyText: searchText ? 
                `Không tìm thấy sản phẩm với từ khóa "${searchText}"` : 
                'Không có dữ liệu'
            }}
            scroll={{ x: 1000 }}
          />
        </Card>

        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingOutlined />
              {editingProduct ? 'Sửa Sản phẩm' : 'Thêm Sản phẩm'}
            </div>
          }
          open={isModalVisible}
          onOk={handleOk}
          onCancel={handleCancel}
          width={600}
          okText={editingProduct ? 'Cập nhật' : 'Thêm mới'}
          cancelText="Hủy"
        >
          <Form form={form} layout="vertical" style={{ marginTop: '20px' }}>
            <Form.Item 
              name="ten_san_pham" 
              label="Tên sản phẩm" 
              rules={[
                { required: true, message: 'Vui lòng nhập tên sản phẩm!' },
                { min: 2, message: 'Tên sản phẩm phải có ít nhất 2 ký tự!' }
              ]}
            >
              <Input placeholder="Nhập tên sản phẩm" />
            </Form.Item>

            <Form.Item 
              name="ma_san_pham" 
              label="Mã sản phẩm" 
              rules={[
                { required: true, message: 'Vui lòng nhập mã sản phẩm!' },
                { pattern: /^[A-Z0-9]+$/, message: 'Mã sản phẩm chỉ được chứa chữ hoa và số!' }
              ]}
            >
              <Input 
                placeholder="VD: SP001" 
                style={{ fontFamily: 'monospace' }}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  form.setFieldValue('ma_san_pham', value);
                }}
              />
            </Form.Item>

            <Form.Item 
              name="don_vi_tinh" 
              label="Đơn vị tính" 
              rules={[{ required: true, message: 'Vui lòng nhập đơn vị tính!' }]}
            >
              <Input placeholder="VD: Cái, Kg, Hộp, ..." />
            </Form.Item>

            <Form.Item 
              name="gia_ban" 
              label="Giá bán (VNĐ)" 
              rules={[
                { required: true, message: 'Vui lòng nhập giá bán!' },
                { type: 'number', min: 1000, message: 'Giá bán phải lớn hơn 1.000 VNĐ!' }
              ]}
            >
              <InputNumber 
                style={{ width: '100%' }} 
                placeholder="Nhập giá bán"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                min={1000}
                step={1000}
              />
            </Form.Item>

            <Form.Item 
              name="so_luong" 
              label="Số lượng tồn kho" 
              rules={[
                { required: true, message: 'Vui lòng nhập số lượng!' },
                { type: 'number', min: 0, message: 'Số lượng không được âm!' }
              ]}
            >
              <InputNumber 
                style={{ width: '100%' }} 
                placeholder="Nhập số lượng"
                min={0}
                precision={0}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
});

ProductManagement.displayName = 'ProductManagement';
export default ProductManagement;