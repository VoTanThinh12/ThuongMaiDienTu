import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, InputNumber, Spin, message, Descriptions } from 'antd';
import { ShoppingCartOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { storefrontAPI, cartAPI } from '../utils/api';
import './ProductDetail.css';

const ProductDetail = ({ onCartUpdate }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await storefrontAPI.getProductDetail(id);
      setProduct(response.data);
    } catch (error) {
      message.error('Không tìm thấy sản phẩm');
      navigate('/products');
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

  const handleAddToCart = async () => {
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
        so_luong: quantity
      });
      message.success('Đã thêm vào giỏ hàng!');
      if (onCartUpdate) onCartUpdate();
    } catch (error) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra!');
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="product-detail-page">
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate(-1)}
        style={{ marginBottom: 24 }}
      >
        Quay lại
      </Button>

      <Card>
        <div className="product-detail-content">
          <div className="product-image-large">
            <img
              alt={product.ten_san_pham}
              src={product.hinh_anh || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlPhbSBwaOG7mTwvdGV4dD48L3N2Zz4='}
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlPhbSBwaOG7mTwvdGV4dD48L3N2Zz4=';
              }}
            />
          </div>

          <div className="product-details">
            <h1>{product.ten_san_pham}</h1>
            <div className="product-code">Mã: {product.ma_san_pham}</div>
            <div className="product-price-large">{formatCurrency(product.gia_ban)}</div>

            <Descriptions column={1} style={{ marginTop: 24 }}>
              <Descriptions.Item label="Đơn vị tính">
                {product.don_vi_tinh}
              </Descriptions.Item>
              <Descriptions.Item label="Tồn kho">
                <span style={{ 
                  color: product.so_luong > 0 ? '#52c41a' : '#ff4d4f',
                  fontWeight: 'bold' 
                }}>
                  {product.so_luong > 0 ? `Còn ${product.so_luong}` : 'Hết hàng'}
                </span>
              </Descriptions.Item>
            </Descriptions>

            {product.so_luong > 0 && (
              <div className="add-to-cart-section">
                <div className="quantity-selector">
                  <label>Số lượng:</label>
                  <InputNumber
                    min={1}
                    max={product.so_luong}
                    value={quantity}
                    onChange={setQuantity}
                    size="large"
                  />
                </div>
                <Button
                  type="primary"
                  size="large"
                  icon={<ShoppingCartOutlined />}
                  onClick={handleAddToCart}
                  loading={adding}
                  block
                >
                  Thêm vào giỏ hàng
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProductDetail;