import React from 'react';
import { Row, Col, Typography, Space } from 'antd';
import { 
  PhoneOutlined, 
  MailOutlined, 
  EnvironmentOutlined,
  FacebookOutlined,
  InstagramOutlined,
  TwitterOutlined
} from '@ant-design/icons';
import './Footer.css';

const { Title, Text } = Typography;

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="footer-container">
        <Row gutter={[32, 32]}>
          <Col xs={24} sm={12} md={8}>
            <div className="footer-section">
              <Title level={4} className="footer-title">
                🏪 Cửa Hàng Tiện Lợi
              </Title>
              <Text className="footer-description">
                Cung cấp các sản phẩm chất lượng cao với dịch vụ giao hàng nhanh chóng và tiện lợi.
              </Text>
              <Space size="large" style={{ marginTop: 16 }}>
                <FacebookOutlined className="social-icon" />
                <InstagramOutlined className="social-icon" />
                <TwitterOutlined className="social-icon" />
              </Space>
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={8}>
            <div className="footer-section">
              <Title level={5} className="footer-subtitle">Liên hệ</Title>
              <div className="contact-info">
                <div className="contact-item">
                  <PhoneOutlined />
                  <span>Hotline: 1900 1234</span>
                </div>
                <div className="contact-item">
                  <MailOutlined />
                  <span>Email: support@cuahang.com</span>
                </div>
                <div className="contact-item">
                  <EnvironmentOutlined />
                  <span>Địa chỉ: 123 Đường ABC, Quận 1, TP.HCM</span>
                </div>
              </div>
            </div>
          </Col>
          
          <Col xs={24} sm={12} md={8}>
            <div className="footer-section">
              <Title level={5} className="footer-subtitle">Dịch vụ</Title>
              <div className="service-links">
                <a href="/products">Sản phẩm</a>
                <a href="/cart">Giỏ hàng</a>
                <a href="/orders">Đơn hàng</a>
                <a href="/support">Hỗ trợ</a>
              </div>
            </div>
          </Col>
        </Row>
        
        <div className="footer-bottom">
          <Text className="copyright">
            © 2024 Cửa Hàng Tiện Lợi. Tất cả quyền được bảo lưu.
          </Text>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
