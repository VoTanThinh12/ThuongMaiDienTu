import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Row, Col, Input, Pagination, Spin, Empty, Card, Select, Button, Space, Tag, Divider } from 'antd';
import { 
  SearchOutlined, 
  FilterOutlined, 
  SortAscendingOutlined,
  FireOutlined,
  StarOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { storefrontAPI } from '../utils/api';
import ProductCard from '../components/ProductCard';
import './ProductList.css';

const { Option } = Select;

const ProductList = ({ onCartUpdate }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const initialCategory = new URLSearchParams(location.search).get('category') || '';
  const [filters, setFilters] = useState({
    category: initialCategory,
    sortBy: 'name',
    sortOrder: 'asc',
    priceRange: '',
    inStock: false
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category');
    if (cat) {
      setFilters(prev => ({ ...prev, category: cat }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    fetchProducts();
  }, [pagination.page, searchText, filters]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        q: searchText,
        ...filters
      };
      
      console.log('Fetching products with params:', params);
      const response = await storefrontAPI.getProducts(params);
      console.log('Products response:', response.data);
      setProducts(response.data.items || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total
      }));
    } catch (error) {
      console.error('Fetch products error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
    if (key === 'category') {
      const params = new URLSearchParams(location.search);
      if (value) {
        params.set('category', value);
      } else {
        params.delete('category');
      }
      navigate({ pathname: '/products', search: params.toString() });
    }
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      sortBy: 'name',
      sortOrder: 'asc',
      priceRange: '',
      inStock: false
    });
    setSearchText('');
    setPagination(prev => ({ ...prev, page: 1 }));
    const params = new URLSearchParams(location.search);
    params.delete('category');
    navigate({ pathname: '/products', search: params.toString() });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.priceRange) count++;
    if (filters.inStock) count++;
    if (filters.sortBy !== 'name' || filters.sortOrder !== 'asc') count++;
    return count;
  };

  return (
    <div className="product-list-page">
      <div className="page-header">
        <h1>Danh sách sản phẩm</h1>
        <Space size="middle">
          <Input.Search
            placeholder="Tìm kiếm sản phẩm..."
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearch}
            style={{ maxWidth: 400 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button
            icon={<FilterOutlined />}
            size="large"
            onClick={() => setShowFilters(!showFilters)}
            type={showFilters ? 'primary' : 'default'}
          >
            Bộ lọc {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
          </Button>
        </Space>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="filters-panel" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <label>Danh mục:</label>
              <Select
                placeholder="Chọn danh mục"
                style={{ width: '100%' }}
                value={filters.category}
                onChange={(value) => handleFilterChange('category', value)}
                allowClear
              >
                <Option value="drinks">Đồ uống</Option>
                <Option value="snacks">Bánh kẹo</Option>
                <Option value="dairy">Sữa & Sản phẩm từ sữa</Option>
                <Option value="instant">Mì ăn liền</Option>
                <Option value="frozen">Đồ đông lạnh</Option>
                <Option value="household">Đồ gia dụng</Option>
                <Option value="personalcare">Chăm sóc cá nhân</Option>
                <Option value="groceries">Tạp hóa</Option>
              </Select>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <label>Sắp xếp theo:</label>
              <Select
                style={{ width: '100%' }}
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(value) => {
                  const [sortBy, sortOrder] = value.split('-');
                  handleFilterChange('sortBy', sortBy);
                  handleFilterChange('sortOrder', sortOrder);
                }}
              >
                <Option value="name-asc">Tên A-Z</Option>
                <Option value="name-desc">Tên Z-A</Option>
                <Option value="price-asc">Giá thấp đến cao</Option>
                <Option value="price-desc">Giá cao đến thấp</Option>
                <Option value="stock-asc">Tồn kho ít nhất</Option>
                <Option value="stock-desc">Tồn kho nhiều nhất</Option>
              </Select>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <label>Khoảng giá:</label>
              <Select
                placeholder="Chọn khoảng giá"
                style={{ width: '100%' }}
                value={filters.priceRange}
                onChange={(value) => handleFilterChange('priceRange', value)}
                allowClear
              >
                <Option value="0-10000">Dưới 10.000đ</Option>
                <Option value="10000-25000">10.000đ - 25.000đ</Option>
                <Option value="25000-50000">25.000đ - 50.000đ</Option>
                <Option value="50000-100000">50.000đ - 100.000đ</Option>
                <Option value="100000-999999">Trên 100.000đ</Option>
              </Select>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <Space>
                <Button
                  type={filters.inStock ? 'primary' : 'default'}
                  onClick={() => handleFilterChange('inStock', !filters.inStock)}
                  icon={<StarOutlined />}
                >
                  Còn hàng
                </Button>
                <Button onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Results Summary */}
      {!loading && (
        <div className="results-summary">
          <Space>
            <span>Tìm thấy <strong>{pagination.total}</strong> sản phẩm (Hiển thị: {products.length})</span>
            {searchText && (
              <Tag closable onClose={() => setSearchText('')}>
                Tìm kiếm: "{searchText}"
              </Tag>
            )}
            {filters.category && (
              <Tag closable onClose={() => handleFilterChange('category', '')}>
                Danh mục: {filters.category}
              </Tag>
            )}
            {filters.priceRange && (
              <Tag closable onClose={() => handleFilterChange('priceRange', '')}>
                Giá: {filters.priceRange}
              </Tag>
            )}
            {filters.inStock && (
              <Tag closable onClose={() => handleFilterChange('inStock', false)}>
                Còn hàng
              </Tag>
            )}
          </Space>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
          <p>Đang tải sản phẩm...</p>
        </div>
      ) : products.length === 0 ? (
        <Empty 
          description={`Không tìm thấy sản phẩm (Đã load: ${products.length} sản phẩm)`}
          style={{ padding: '100px 0' }}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={clearFilters}>
            Xóa bộ lọc
          </Button>
          <Button type="default" onClick={fetchProducts} style={{ marginLeft: 8 }}>
            Thử lại
          </Button>
        </Empty>
      ) : (
        <>
          <div className="products-grid">
            <Row gutter={[24, 24]}>
              {products.map(product => (
                <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
                  <ProductCard product={product} onCartUpdate={onCartUpdate} />
                </Col>
              ))}
            </Row>
          </div>

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Pagination
              current={pagination.page}
              total={pagination.total}
              pageSize={pagination.limit}
              onChange={(page) => setPagination(prev => ({ ...prev, page }))}
              showSizeChanger={false}
              showQuickJumper
              showTotal={(total, range) => 
                `${range[0]}-${range[1]} của ${total} sản phẩm`
              }
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ProductList;