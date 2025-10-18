import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Button, Dropdown } from 'antd';
import { ShoppingCartOutlined, UserOutlined, LogoutOutlined, HistoryOutlined } from '@ant-design/icons';
import './Header.css';

const Header = ({ cartCount }) => {
  const navigate = useNavigate();
  const customerInfo = JSON.parse(localStorage.getItem('customerInfo') || '{}');
  const isLoggedIn = !!localStorage.getItem('customerToken');

  const handleLogout = () => {
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerInfo');
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'orders',
      icon: <HistoryOutlined />,
      label: 'Đơn hàng của tôi',
      onClick: () => navigate('/orders')
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogout
    }
  ];

  return (
    <header className="app-header">
      <div className="header-container">
        <Link to="/" className="logo">
          🏪 Cửa Hàng Tiện Lợi
        </Link>

        <nav className="nav-menu">
          <Link to="/">Trang chủ</Link>
          <Link to="/products">Sản phẩm</Link>
          {isLoggedIn && <Link to="/orders">Đơn hàng của tôi</Link>}
        </nav>

        <div className="header-actions">
          <Link to="/cart" className="cart-button">
            <Badge count={cartCount} showZero>
              <ShoppingCartOutlined style={{ fontSize: '24px', color: '#fff' }} />
            </Badge>
          </Link>

          {isLoggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Dropdown 
                menu={{ items: userMenuItems }} 
                placement="bottomRight"
                trigger={['click']}
                overlayStyle={{ zIndex: 9999 }}
              >
                <Button 
                  type="text" 
                  style={{ 
                    color: '#fff',
                    border: 'none',
                    background: 'transparent',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                  }}
                >
                  <UserOutlined /> {customerInfo.ho_ten}
                </Button>
              </Dropdown>
              
              <Button 
                type="text" 
                onClick={handleLogout}
                style={{ 
                  color: '#fff',
                  border: 'none',
                  background: 'transparent',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
                title="Đăng xuất"
              >
                <LogoutOutlined />
              </Button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Button type="link" onClick={() => navigate('/login')} style={{ color: '#fff' }}>
                Đăng nhập
              </Button>
              <Button type="primary" onClick={() => navigate('/register')}>
                Đăng ký
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;