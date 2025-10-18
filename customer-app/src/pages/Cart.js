import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, InputNumber, Empty, message, Spin, Checkbox, Divider, Modal } from 'antd';
import { DeleteOutlined, ShoppingOutlined } from '@ant-design/icons';
import { cartAPI } from '../utils/api';
import './Cart.css';

const Cart = ({ onCartUpdate }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await cartAPI.getCart();
      setCartItems(response.data);
    } catch (error) {
      message.error('Lỗi khi tải giỏ hàng');
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

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      await cartAPI.updateCartItem(itemId, { so_luong: newQuantity });
      fetchCart();
      if (onCartUpdate) onCartUpdate();
      message.success('Đã cập nhật số lượng');
    } catch (error) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra!');
      fetchCart();
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await cartAPI.removeFromCart(itemId);
      fetchCart();
      if (onCartUpdate) onCartUpdate();
      message.success('Đã xóa sản phẩm khỏi giỏ hàng');
    } catch (error) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra!');
    }
  };

  const [confirmingId, setConfirmingId] = useState(null);

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (Number(item.san_pham.gia_ban) * item.so_luong);
    }, 0);
  };

  const calculateSelectedTotal = () => {
    return selectedItems.reduce((total, itemId) => {
      const item = cartItems.find(cartItem => cartItem.id === itemId);
      if (item) {
        return total + (Number(item.san_pham.gia_ban) * item.so_luong);
      }
      return total;
    }, 0);
  };

  const handleSelectItem = (itemId, checked) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(cartItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const isAllSelected = selectedItems.length === cartItems.length && cartItems.length > 0;
  const isIndeterminate = selectedItems.length > 0 && selectedItems.length < cartItems.length;

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      message.warning('Vui lòng chọn ít nhất một sản phẩm để đặt hàng');
      return;
    }
    
    // Lưu danh sách sản phẩm đã chọn vào localStorage để checkout sử dụng
    localStorage.setItem('selectedCartItems', JSON.stringify(selectedItems));
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <Card>
          <Empty
            description="Giỏ hàng trống"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate('/products')}>
              Tiếp tục mua sắm
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>Giỏ hàng của bạn</h1>

      <div className="cart-content">
        <div className="cart-items">
          {/* Header với checkbox chọn tất cả */}
          <Card className="cart-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Checkbox
                checked={isAllSelected}
                indeterminate={isIndeterminate}
                onChange={(e) => handleSelectAll(e.target.checked)}
              >
                Chọn tất cả ({cartItems.length} sản phẩm)
              </Checkbox>
              <span style={{ color: '#666', fontSize: '14px' }}>
                Đã chọn: {selectedItems.length} sản phẩm
              </span>
            </div>
          </Card>

          {cartItems.map(item => (
            <Card key={item.id} className="cart-item">
              <div className="cart-item-content">
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                />
                
                <img
                  src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNQPC90ZXh0Pjwvc3ZnPg=="
                  alt={item.san_pham.ten_san_pham}
                  className="cart-item-image"
                />
                
                <div className="cart-item-info">
                  <h3>{item.san_pham.ten_san_pham}</h3>
                  <p className="cart-item-code">Mã: {item.san_pham.ma_san_pham}</p>
                  <p className="cart-item-price">
                    {formatCurrency(item.san_pham.gia_ban)}
                  </p>
                </div>

                <div className="cart-item-actions">
                  <InputNumber
                    min={1}
                    max={item.san_pham.so_luong}
                    value={item.so_luong}
                    onChange={(value) => handleUpdateQuantity(item.id, value)}
                  />
                  
                  <div className="cart-item-subtotal">
                    {formatCurrency(Number(item.san_pham.gia_ban) * item.so_luong)}
                  </div>

                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setConfirmingId(item.id)} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="cart-summary">
          <Card title="Tổng đơn hàng">
            <div className="summary-row">
              <span>Tạm tính ({selectedItems.length} sản phẩm):</span>
              <span className="summary-amount">{formatCurrency(calculateSelectedTotal())}</span>
            </div>
            <div className="summary-row">
              <span>Phí vận chuyển:</span>
              <span className="summary-amount">Miễn phí</span>
            </div>
            <div className="summary-divider"></div>
            <div className="summary-row total">
              <span>Tổng cộng:</span>
              <span className="summary-total">{formatCurrency(calculateSelectedTotal())}</span>
            </div>
            <Button 
              type="primary" 
              size="large" 
              block
              onClick={handleCheckout}
              disabled={selectedItems.length === 0}
            >
              Tiến hành đặt hàng ({selectedItems.length} sản phẩm)
            </Button>
            <Button 
              size="large" 
              block
              style={{ marginTop: 8 }}
              onClick={() => navigate('/products')}
            >
              <ShoppingOutlined /> Tiếp tục mua sắm
            </Button>
          </Card>
        </div>
    </div>
    
    <Modal
      title="Xóa sản phẩm này?"
      open={confirmingId !== null}
      okText="Xóa"
      cancelText="Hủy"
      okButtonProps={{ danger: true }}
      maskClosable={false}
      destroyOnClose={false}
      getContainer={false}
      onOk={async () => {
        const id = confirmingId;
        setConfirmingId(null);
        if (id != null) {
          await handleRemoveItem(id);
        }
      }}
      onCancel={() => setConfirmingId(null)}
    />
    </div>
  );
};
export default Cart;