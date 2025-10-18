import React, { useState, useEffect } from 'react';
import { Alert, Button, Space } from 'antd';
import { BellOutlined, CloseOutlined, GiftOutlined, FireOutlined } from '@ant-design/icons';

const NotificationBanner = () => {
  const [visible, setVisible] = useState(true);
  const [currentNotification, setCurrentNotification] = useState(0);

  const notifications = [
    {
      type: 'success',
      message: '🎉 Chào mừng bạn đến với cửa hàng tiện lợi! Đăng ký ngay để nhận ưu đãi 20% cho đơn hàng đầu tiên.',
      showIcon: true,
      action: 'Đăng ký ngay'
    },
    {
      type: 'info',
      message: '🚚 Miễn phí giao hàng cho đơn từ 100.000đ. Giao hàng trong 15-30 phút!',
      showIcon: true,
      action: 'Xem chi tiết'
    },
    {
      type: 'warning',
      message: '⚡ Flash Sale! Giảm giá 50% cho tất cả đồ uống có gas. Chỉ còn 2 giờ!',
      showIcon: true,
      action: 'Mua ngay'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentNotification((prev) => (prev + 1) % notifications.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  const notification = notifications[currentNotification];

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      zIndex: 1000,
      padding: '8px 16px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid #f0f0f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <Alert
        message={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {notification.showIcon && (
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%',
                  background: notification.type === 'success' ? '#52c41a' : 
                             notification.type === 'info' ? '#1890ff' : '#faad14',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px'
                }}>
                  {notification.type === 'success' ? <GiftOutlined /> : 
                   notification.type === 'info' ? <BellOutlined /> : <FireOutlined />}
                </div>
              )}
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                {notification.message}
              </span>
            </div>
            <Space>
              <Button 
                type="link" 
                size="small"
                style={{ color: '#1890ff', fontWeight: 600 }}
              >
                {notification.action}
              </Button>
              <Button 
                type="text" 
                size="small"
                icon={<CloseOutlined />}
                onClick={() => setVisible(false)}
                style={{ color: '#999' }}
              />
            </Space>
          </div>
        }
        type={notification.type}
        showIcon={false}
        style={{ 
          border: 'none',
          background: 'transparent',
          padding: 0
        }}
      />
    </div>
  );
};

export default NotificationBanner;
