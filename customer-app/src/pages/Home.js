import React, { useEffect, useState } from 'react';
import { Row, Col, Button, Spin, Card, Typography, Space, Tag, Divider, Input, Badge, Statistic, Carousel, Tabs, Rate, Avatar, List, Alert, Skeleton, notification } from 'antd';
import { 
  FireOutlined, 
  ThunderboltOutlined, 
  GiftOutlined, 
  StarOutlined,
  ShoppingCartOutlined,
  ClockCircleOutlined,
  TruckOutlined,
  SafetyOutlined,
  SearchOutlined,
  HeartOutlined,
  EyeOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  CustomerServiceOutlined,
  TrophyOutlined,
  CrownOutlined,
  RocketOutlined,
  BulbOutlined,
  TeamOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ShoppingOutlined,
  UserOutlined,
  MessageOutlined,
  BellOutlined,
  SettingOutlined,
  BarChartOutlined,
  TrendingUpOutlined,
  LikeOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { storefrontAPI } from '../utils/api';
import ProductCard from '../components/ProductCard';
import './Home.css';

const { Title, Paragraph } = Typography;

const Home = ({ onCartUpdate }) => {
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('featured');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch featured products
      const featuredResponse = await storefrontAPI.getProducts({ 
        limit: 8,
        inStock: 'false'
      });
      setFeaturedProducts(featuredResponse.data.items || []);
      
      // Fetch new products (giả sử có API cho sản phẩm mới)
      const newResponse = await storefrontAPI.getProducts({ 
        limit: 6,
        sortBy: 'ngay_tao',
        sortOrder: 'desc'
      });
      setNewProducts(newResponse.data.items || []);
      
      // Fetch best sellers (giả sử có API cho sản phẩm bán chạy)
      const bestResponse = await storefrontAPI.getProducts({ 
        limit: 6,
        sortBy: 'so_luong',
        sortOrder: 'desc'
      });
      setBestSellers(bestResponse.data.items || []);
      
      setProducts(featuredResponse.data.items || []);
    } catch (error) {
      console.error('Fetch products error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    navigate(`/products?search=${encodeURIComponent(value)}`);
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    navigate(`/products?category=${category}`);
  };

  if (loading) {
    return (
      <div className="home-page">
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* Enhanced Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">
              <CrownOutlined style={{ marginRight: 8 }} />
              Cửa hàng tiện lợi #1 Việt Nam
            </div>
            <Title level={1} className="hero-title">
              <FireOutlined style={{ color: '#FFB7C5', marginRight: 12 }} />
              Mua sắm thông minh
              <br />
              <span style={{ color: '#FFC0CB' }}>Giao hàng siêu tốc</span>
            </Title>
            <Paragraph className="hero-subtitle">
              🚀 Giao hàng trong 15-30 phút • 💰 Miễn phí ship đơn từ 100k • 🛡️ 100% chính hãng
            </Paragraph>
            
            {/* Enhanced Search Bar */}
            <div className="hero-search">
              <div className="search-container">
                <Input
                  placeholder="Tìm kiếm sản phẩm, thương hiệu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onPressEnter={handleSearch}
                  className="search-input"
                  prefix={<SearchOutlined style={{ color: '#666' }} />}
                />
                <Button 
                  type="primary" 
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                  className="search-button"
                >
                  Tìm kiếm
                </Button>
              </div>
            </div>

            <Space size="large" style={{ marginTop: 24 }}>
              <Button 
                type="primary" 
                size="large" 
                icon={<ShoppingCartOutlined />}
                onClick={() => navigate('/products')}
                className="hero-btn-primary"
              >
                🛒 Mua sắm ngay
              </Button>
              <Button 
                size="large" 
                icon={<ThunderboltOutlined />}
                onClick={() => navigate('/products')}
                className="hero-btn-secondary"
              >
                ⚡ Xem tất cả
              </Button>
            </Space>
          </div>
          
          <div className="hero-features">
            <div className="hero-stats">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card size="small" className="feature-card">
                    <ClockCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />
                    <div>
                      <div className="feature-title">Giao hàng nhanh</div>
                      <div className="feature-desc">15-30 phút</div>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" className="feature-card">
                    <TruckOutlined style={{ color: '#1890ff', fontSize: 24 }} />
                    <div>
                      <div className="feature-title">Miễn phí ship</div>
                      <div className="feature-desc">Đơn từ 100k</div>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" className="feature-card">
                    <SafetyOutlined style={{ color: '#fa8c16', fontSize: 24 }} />
                    <div>
                      <div className="feature-title">An toàn</div>
                      <div className="feature-desc">100% chính hãng</div>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" className="feature-card">
                    <GiftOutlined style={{ color: '#eb2f96', fontSize: 24 }} />
                    <div>
                      <div className="feature-title">Ưu đãi</div>
                      <div className="feature-desc">Hàng ngày</div>
                    </div>
                  </Card>
                </Col>
              </Row>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats Section */}
      <section className="quick-stats-section">
        <div className="container">
          <Row gutter={[24, 24]}>
            <Col xs={12} sm={6}>
              <Card className="stat-card">
                <Statistic
                  title="Sản phẩm"
                  value={1250}
                  prefix={<ShoppingOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stat-card">
                <Statistic
                  title="Khách hàng"
                  value={15000}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stat-card">
                <Statistic
                  title="Đơn hàng/ngày"
                  value={850}
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card className="stat-card">
                <Statistic
                  title="Đánh giá"
                  value={4.8}
                  precision={1}
                  prefix={<StarOutlined />}
                  valueStyle={{ color: '#eb2f96' }}
                />
              </Card>
            </Col>
          </Row>
        </div>
      </section>

      {/* Enhanced Categories Section */}
      <section className="categories-section">
        <div className="container">
          <div className="section-header">
            <Title level={2} className="section-title">
              <StarOutlined style={{ color: '#FFB7C5', marginRight: 8 }} />
              Danh mục sản phẩm
            </Title>
            <Button 
              type="link" 
              onClick={() => navigate('/products')}
              style={{ fontSize: 16, fontWeight: 500, color: '#FFB7C5' }}
            >
              Xem tất cả →
            </Button>
          </div>
          
          <Row gutter={[16, 16]}>
            {[
              { icon: '🥤', name: 'Đồ uống', category: 'drinks', color: '#FFB7C5' },
              { icon: '🍿', name: 'Bánh kẹo', category: 'snacks', color: '#FFC0CB' },
              { icon: '🥛', name: 'Sữa & Sản phẩm từ sữa', category: 'dairy', color: '#FFD1DC' },
              { icon: '🍜', name: 'Mì ăn liền', category: 'instant', color: '#FFE4E1' },
              { icon: '🍦', name: 'Đồ đông lạnh', category: 'frozen', color: '#FFB7C5' },
              { icon: '🧻', name: 'Đồ gia dụng', category: 'household', color: '#FFC0CB' },
              { icon: '🧴', name: 'Chăm sóc cá nhân', category: 'personalcare', color: '#FFD1DC' },
              { icon: '🛒', name: 'Tạp hóa', category: 'groceries', color: '#FFE4E1' }
            ].map((item, index) => (
              <Col xs={12} sm={8} md={6} key={index}>
                <Card 
                  hoverable 
                  className="category-card"
                  onClick={() => handleCategoryClick(item.category)}
                  style={{ 
                    border: selectedCategory === item.category ? `2px solid ${item.color}` : '2px solid transparent'
                  }}
                >
                  <div className="category-icon" style={{ fontSize: 32 }}>{item.icon}</div>
                  <div className="category-name">{item.name}</div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Enhanced Products Section with Tabs */}
      <section className="featured-products">
        <div className="container">
          <div className="section-header">
            <Title level={2} className="section-title">
              <FireOutlined style={{ color: '#FFB7C5', marginRight: 8 }} />
              Sản phẩm nổi bật
            </Title>
            <Button 
              type="link" 
              onClick={() => navigate('/products')}
              style={{ fontSize: 16, fontWeight: 500, color: '#FFB7C5' }}
            >
              Xem tất cả →
            </Button>
          </div>
          
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={[
              {
                key: 'featured',
                label: (
                  <span>
                    <StarOutlined />
                    Nổi bật
                  </span>
                ),
                children: (
                  <Row gutter={[24, 24]}>
                    {featuredProducts.length > 0 ? (
                      featuredProducts.map(product => (
                        <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                          <ProductCard product={product} onCartUpdate={onCartUpdate} />
                        </Col>
                      ))
                    ) : (
                      <Col span={24}>
                        <div style={{ textAlign: 'center', padding: '50px 0' }}>
                          <Skeleton active paragraph={{ rows: 4 }} />
                        </div>
                      </Col>
                    )}
                  </Row>
                )
              },
              {
                key: 'new',
                label: (
                  <span>
                    <RocketOutlined />
                    Mới nhất
                  </span>
                ),
                children: (
                  <Row gutter={[24, 24]}>
                    {newProducts.length > 0 ? (
                      newProducts.map(product => (
                        <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                          <ProductCard product={product} onCartUpdate={onCartUpdate} />
                        </Col>
                      ))
                    ) : (
                      <Col span={24}>
                        <div style={{ textAlign: 'center', padding: '50px 0' }}>
                          <Skeleton active paragraph={{ rows: 4 }} />
                        </div>
                      </Col>
                    )}
                  </Row>
                )
              },
              {
                key: 'bestsellers',
                label: (
                  <span>
                    <TrophyOutlined />
                    Bán chạy
                  </span>
                ),
                children: (
                  <Row gutter={[24, 24]}>
                    {bestSellers.length > 0 ? (
                      bestSellers.map(product => (
                        <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                          <ProductCard product={product} onCartUpdate={onCartUpdate} />
                        </Col>
                      ))
                    ) : (
                      <Col span={24}>
                        <div style={{ textAlign: 'center', padding: '50px 0' }}>
                          <Skeleton active paragraph={{ rows: 4 }} />
                        </div>
                      </Col>
                    )}
                  </Row>
                )
              }
            ]}
          />
        </div>
      </section>

      {/* Enhanced Promotions Section */}
      <section className="promotions-section">
        <div className="container">
          <Title level={2} className="section-title">
            <GiftOutlined style={{ color: '#FFB7C5', marginRight: 8 }} />
            Ưu đãi hôm nay
          </Title>
          
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card className="promo-card promo-card-primary">
                <div className="promo-content">
                  <div className="promo-icon">🎉</div>
                  <div className="promo-text">
                    <div className="promo-title">Giảm giá 20%</div>
                    <div className="promo-desc">Tất cả đồ uống có gas</div>
                    <Tag color="red" className="promo-tag">HOT</Tag>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="promo-card promo-card-secondary">
                <div className="promo-content">
                  <div className="promo-icon">🚚</div>
                  <div className="promo-text">
                    <div className="promo-title">Miễn phí ship</div>
                    <div className="promo-desc">Đơn hàng từ 100.000đ</div>
                    <Tag color="blue" className="promo-tag">NEW</Tag>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </section>

      {/* Unified Features Section */}
      <section className="unified-features-section">
        <div className="container">
          <div className="features-grid">
            {/* Quick Functions */}
            <div className="feature-group">
              <Title level={3} className="group-title">
                <RocketOutlined style={{ color: '#667eea', marginRight: 8 }} />
                Chức năng nhanh
              </Title>
              <div className="feature-cards">
                <div className="feature-card" onClick={() => navigate('/products?sort=price&order=asc')}>
                  <div className="feature-icon">
                    <DollarOutlined />
                  </div>
                  <div className="feature-content">
                    <div className="feature-title">Giá rẻ nhất</div>
                    <div className="feature-desc">Sản phẩm giá tốt</div>
                  </div>
                </div>
                <div className="feature-card" onClick={() => navigate('/products?sort=date&order=desc')}>
                  <div className="feature-icon">
                    <RocketOutlined />
                  </div>
                  <div className="feature-content">
                    <div className="feature-title">Mới nhất</div>
                    <div className="feature-desc">Sản phẩm vừa về</div>
                  </div>
                </div>
                <div className="feature-card" onClick={() => navigate('/products?stock=true')}>
                  <div className="feature-icon">
                    <CheckCircleOutlined />
                  </div>
                  <div className="feature-content">
                    <div className="feature-title">Còn hàng</div>
                    <div className="feature-desc">Sản phẩm có sẵn</div>
                  </div>
                </div>
                <div className="feature-card" onClick={() => navigate('/products?discount=true')}>
                  <div className="feature-icon">
                    <GiftOutlined />
                  </div>
                  <div className="feature-content">
                    <div className="feature-title">Đang giảm giá</div>
                    <div className="feature-desc">Ưu đãi hấp dẫn</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Why Choose Us */}
            <div className="feature-group">
              <Title level={3} className="group-title">
                <BulbOutlined style={{ color: '#667eea', marginRight: 8 }} />
                Tại sao chọn chúng tôi?
              </Title>
              <div className="feature-cards">
                <div className="feature-card">
                  <div className="feature-icon">
                    <SafetyOutlined />
                  </div>
                  <div className="feature-content">
                    <div className="feature-title">Chất lượng đảm bảo</div>
                    <div className="feature-desc">100% chính hãng</div>
                  </div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">
                    <CustomerServiceOutlined />
                  </div>
                  <div className="feature-content">
                    <div className="feature-title">Hỗ trợ 24/7</div>
                    <div className="feature-desc">Luôn sẵn sàng</div>
                  </div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">
                    <TruckOutlined />
                  </div>
                  <div className="feature-content">
                    <div className="feature-title">Giao hàng nhanh</div>
                    <div className="feature-desc">15-30 phút</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Store Info */}
            <div className="feature-group">
              <Title level={3} className="group-title">
                <EnvironmentOutlined style={{ color: '#667eea', marginRight: 8 }} />
                Thông tin cửa hàng
              </Title>
              <div className="info-cards">
                <div className="info-card">
                  <div className="info-icon">
                    <ClockCircleOutlined />
                  </div>
                  <div className="info-content">
                    <div className="info-title">Giờ mở cửa</div>
                    <div className="info-desc">T2-CN: 7:00-22:00</div>
                  </div>
                </div>
                <div className="info-card">
                  <div className="info-icon">
                    <TruckOutlined />
                  </div>
                  <div className="info-content">
                    <div className="info-title">Giao hàng</div>
                    <div className="info-desc">Miễn phí từ 100k</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact & Social */}
            <div className="feature-group">
              <Title level={3} className="group-title">
                <PhoneOutlined style={{ color: '#667eea', marginRight: 8 }} />
                Liên hệ & Kết nối
              </Title>
              <div className="contact-cards">
                <div className="contact-card">
                  <div className="contact-icon">
                    <PhoneOutlined />
                  </div>
                  <div className="contact-content">
                    <div className="contact-title">Hotline</div>
                    <div className="contact-desc">1900-xxxx</div>
                  </div>
                </div>
                <div className="contact-card">
                  <div className="contact-icon">
                    <MessageOutlined />
                  </div>
                  <div className="contact-content">
                    <div className="contact-title">Chat trực tiếp</div>
                    <div className="contact-desc">Hỗ trợ ngay</div>
                  </div>
                </div>
                <div className="contact-card">
                  <div className="contact-icon">
                    <MailOutlined />
                  </div>
                  <div className="contact-content">
                    <div className="contact-title">Email</div>
                    <div className="contact-desc">support@store.com</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
};

export default Home;