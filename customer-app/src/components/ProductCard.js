import React, { useState } from 'react';
import { Card, Button, message, Space, Badge, Tag } from 'antd';
import { ShoppingCartOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { cartAPI } from '../utils/api';
import './ProductCard.css';

const ProductCard = ({ product, onCartUpdate }) => {
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);


  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    
    const token = localStorage.getItem('customerToken');
    if (!token) {
      message.warning('Vui lòng đăng nhập để thêm vào giỏ hàng');
      navigate('/login');
      return;
    }

    setAdding(true);
    try {
      await cartAPI.addToCart({
        id_san_pham: product.id,
        so_luong: 1
      });
      message.success('Đã thêm sản phẩm vào giỏ hàng!');
      if (onCartUpdate) onCartUpdate();
    } catch (error) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra!');
    } finally {
      setAdding(false);
    }
  };

  const handleQuickBuy = async (e) => {
    e.stopPropagation();
    
    const token = localStorage.getItem('customerToken');
    if (!token) {
      message.warning('Vui lòng đăng nhập để mua hàng');
      navigate('/login');
      return;
    }

    setAdding(true);
    try {
      await cartAPI.addToCart({
        id_san_pham: product.id,
        so_luong: 1
      });
      message.success('Đã thêm vào giỏ hàng! Chuyển đến trang thanh toán...');
      if (onCartUpdate) onCartUpdate();
      setTimeout(() => {
        navigate('/cart');
      }, 1000);
    } catch (error) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra!');
    } finally {
      setAdding(false);
    }
  };

  const isLowStock = product.so_luong && product.so_luong > 0 && product.so_luong <= 5;

  return (
    <Badge.Ribbon 
      text={isLowStock ? "Sắp hết" : ""} 
      color={isLowStock ? "orange" : ""}
    >
      <Card
        hoverable
        className="product-card"
        cover={
          <div className="product-image">
            <img
              alt={product.ten_san_pham}
              src={product.hinh_anh || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
              }}
            />
            {isLowStock && (
              <Tag color="orange" className="stock-warning">
                Còn {product.so_luong} {product.don_vi_tinh}
              </Tag>
            )}
          </div>
        }
        onClick={() => navigate(`/products/${product.id}`)}
        styles={{
          body: {
            padding: '12px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }
        }}
      >
        <Card.Meta
          title={
            <div className="product-title">
              {product.ten_san_pham}
            </div>
          }
          description={
            <div className="product-info">
              {product.danh_muc && (
                <Tag color="blue" style={{ marginBottom: 6, alignSelf: 'flex-start' }}>
                  {product.danh_muc}
                </Tag>
              )}
              <div className="product-price">{formatCurrency(product.gia_ban)}</div>
              <div className="product-stock">
                <span style={{ color: isLowStock ? '#fa8c16' : '#52c41a' }}>
                  Còn: {product.so_luong || 0} {product.don_vi_tinh}
                </span>
              </div>
            </div>
          }
        />
        
        <div className="product-actions">
          <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<ShoppingCartOutlined />}
                block
                onClick={handleAddToCart}
                loading={adding}
                size="small"
                style={{
                  height: 32,
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: '12px',
                  background: 'linear-gradient(135deg, #1890ff, #40a9ff)',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)'
                }}
              >
                Thêm vào giỏ
              </Button>
              
              <Button
                type="default"
                icon={<ThunderboltOutlined />}
                block
                onClick={handleQuickBuy}
                loading={adding}
                size="small"
                style={{ 
                  height: 32,
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: '12px',
                  background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)',
                  border: 'none',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)'
                }}
              >
                Mua ngay
              </Button>
          </Space>
        </div>
      </Card>
    </Badge.Ribbon>
  );
};

export default ProductCard;