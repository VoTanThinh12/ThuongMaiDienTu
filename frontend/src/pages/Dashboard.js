import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  message,
  Spin,
  Empty,
  List,
  Avatar,
  Tag,
  Typography,
  Badge,
} from "antd";
import {
  ShoppingOutlined,
  UserOutlined,
  DollarOutlined,
  FileTextOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  ShoppingCartOutlined,
  ImportOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import api from "../utils/api";
// import MainLayout from '../components/MainLayout';
import { Column, Pie } from "@ant-design/plots";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [dailyRevenue, setDailyRevenue] = useState([]);
  const [stockByType, setStockByType] = useState([]);
  const [topSellingProducts, setTopSellingProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [topEmployees, setTopEmployees] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          message.error("Bạn chưa đăng nhập");
          navigate("/login");
          return;
        }

        const res = await api.get("/dashboard/summary", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setStats(res.data.stats);
        setDailyRevenue(res.data.charts.dailyRevenue);
        setStockByType(res.data.charts.stockByType);
        setTopSellingProducts(res.data.topSellingProducts || []);
        setLowStockProducts(res.data.lowStockProducts || []);
        setTopEmployees(res.data.topEmployees || []);
        setRecentActivities(res.data.recentActivities || []);
      } catch (error) {
        console.error("Lỗi tải Dashboard:", error);
        if (error.response?.status === 401) {
          message.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại");
          localStorage.removeItem("token");
          navigate("/login");
        } else {
          message.error("Không thể tải dữ liệu Dashboard");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const handleCardClick = (card) => {
    if (card.clickable && card.route) {
      navigate(card.route);
    }
  };

  const dashboardCards = [
    {
      title: "Tổng sản phẩm",
      value: stats.totalProducts ?? 0,
      icon: <ShoppingOutlined style={{ fontSize: 36, color: "#1890ff" }} />,
      color: "#e6f7ff",
      clickable: true,
      route: "/sanpham",
    },
    {
      title: "Tổng nhân viên",
      value: stats.totalEmployees ?? 0,
      icon: <UserOutlined style={{ fontSize: 36, color: "#52c41a" }} />,
      color: "#f6ffed",
      clickable: true,
      route: "/nhanvien",
    },
    {
      title: "Tổng doanh thu",
      value: formatCurrency(stats.totalRevenue || 0),
      icon: <DollarOutlined style={{ fontSize: 36, color: "#faad14" }} />,
      color: "#fffbe6",
      clickable: true,
      route: "/baocao/doanhthu",
    },
    {
      title: "Tổng hóa đơn",
      value: stats.totalInvoices ?? 0,
      icon: <FileTextOutlined style={{ fontSize: 36, color: "#722ed1" }} />,
      color: "#f9f0ff",
      clickable: true,
      route: "/hoadonban",
    },
  ];

  // Format daily revenue data
  const formattedDailyRevenue = dailyRevenue
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((item) => {
      try {
        const date = new Date(item.date);
        const dateFormatted = date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        });
        return {
          ...item,
          dateFormatted: dateFormatted,
        };
      } catch {
        return {
          ...item,
          dateFormatted: item.date,
        };
      }
    });

  // Column chart config
  const columnConfig = {
    data: formattedDailyRevenue,
    xField: "dateFormatted",
    yField: "revenue",
    columnStyle: {
      fill: "#1890ff",
    },
    label: false,
  };

  // Pie chart config
  const pieConfig = {
    data: stockByType.filter((item) => item.value > 0),
    angleField: "value",
    colorField: "type",
    radius: 0.8,
    height: 280,
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "sale":
        return <ShoppingCartOutlined style={{ color: "#52c41a" }} />;
      case "purchase":
        return <ImportOutlined style={{ color: "#1890ff" }} />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "sale":
        return "success";
      case "purchase":
        return "processing";
      default:
        return "default";
    }
  };

  return (
    // <div>
    <div style={{ padding: "0 24px" }}>
      <Title level={2} style={{ marginBottom: 32, color: "#001529" }}>
        Dashboard - Tổng quan hệ thống
      </Title>

      <Spin spinning={loading}>
        {/* Thống kê tổng quan */}
        <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
          {dashboardCards.map((card, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card
                onClick={() => handleCardClick(card)}
                style={{
                  backgroundColor: card.color,
                  borderRadius: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  cursor: card.clickable ? "pointer" : "default",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  border: "none",
                  height: "120px",
                }}
                onMouseEnter={(e) => {
                  if (card.clickable) {
                    e.currentTarget.style.transform = "translateY(-8px)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 24px rgba(0,0,0,0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (card.clickable) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(0,0,0,0.1)";
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      borderRadius: "50%",
                      padding: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {card.icon}
                  </div>
                  <Statistic
                    title={card.title}
                    value={card.value}
                    titleStyle={{ fontSize: 14, fontWeight: 500 }}
                    valueStyle={{ fontSize: 20, fontWeight: "bold" }}
                  />
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Nhân viên của tháng và Hoạt động gần đây */}
        <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TrophyOutlined style={{ color: "#faad14" }} />
                  <span>Nhân viên của tháng</span>
                </div>
              }
              style={{
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                border: "none",
                height: "200px",
              }}
              bodyStyle={{
                padding: "0 16px",
                height: "140px",
                overflow: "auto",
              }}
            >
              {topEmployees.length > 0 ? (
                <List
                  dataSource={topEmployees}
                  renderItem={(item, index) => (
                    <List.Item style={{ padding: "10px 0", border: "none" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          width: "100%",
                        }}
                      >
                        <Badge
                          count={index + 1}
                          style={{
                            backgroundColor:
                              index === 0
                                ? "#faad14"
                                : index === 1
                                ? "#d9d9d9"
                                : "#f0f0f0",
                            color: index <= 1 ? "#fff" : "#666",
                            boxShadow: "0 0 0 1px #fff",
                          }}
                        />
                        <Avatar icon={<UserOutlined />} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong ellipsis style={{ display: "block" }}>
                            {item.name}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Doanh thu: {formatCurrency(item.revenue)}
                          </Text>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Empty
                    description="Chưa có dữ liệu nhân viên của tháng"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ClockCircleOutlined style={{ color: "#1890ff" }} />
                  <span>Hoạt động gần đây</span>
                </div>
              }
              style={{
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                border: "none",
                height: "200px",
              }}
              bodyStyle={{
                padding: "16px",
                height: "140px",
                overflow: "hidden",
              }}
            >
              {recentActivities.length > 0 ? (
                <List
                  size="small"
                  dataSource={recentActivities}
                  renderItem={(item) => (
                    <List.Item style={{ padding: "8px 0", border: "none" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          width: "100%",
                        }}
                      >
                        <Avatar
                          size="small"
                          icon={getActivityIcon(item.type)}
                          style={{
                            backgroundColor:
                              item.type === "sale" ? "#f6ffed" : "#e6f7ff",
                            border:
                              item.type === "sale"
                                ? "1px solid #b7eb8f"
                                : "1px solid #91d5ff",
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={{ fontSize: 12, display: "block" }}
                            ellipsis
                          >
                            {item.description}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {formatDate(item.date)}
                          </Text>
                        </div>
                        <Tag color={getActivityColor(item.type)} size="small">
                          {item.type === "sale" ? "Bán" : "Nhập"}
                        </Tag>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty
                  description="Chưa có hoạt động gần đây"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </Col>
        </Row>

        {/* Biểu đồ doanh thu */}
        <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
          <Col span={24}>
            <Card
              title="Doanh thu 7 ngày gần nhất"
              style={{
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                border: "none",
              }}
            >
              {dailyRevenue && dailyRevenue.length > 0 ? (
                <Column {...columnConfig} />
              ) : (
                <Empty description="Không có dữ liệu doanh thu để hiển thị" />
              )}
            </Card>
          </Col>
        </Row>

        {/* Sản phẩm bán chạy, Tồn kho và Cảnh báo */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={8}>
            <Card
              title="Top 5 sản phẩm bán chạy"
              style={{
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                border: "none",
                height: "400px",
              }}
              bodyStyle={{ height: "320px", overflow: "auto" }}
            >
              {topSellingProducts.length > 0 ? (
                <List
                  dataSource={topSellingProducts}
                  renderItem={(item, index) => (
                    <List.Item style={{ padding: "12px 0" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          width: "100%",
                        }}
                      >
                        <Badge
                          count={index + 1}
                          style={{
                            backgroundColor:
                              index === 0
                                ? "#faad14"
                                : index === 1
                                ? "#d9d9d9"
                                : "#f0f0f0",
                            color: index <= 1 ? "#fff" : "#666",
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong ellipsis style={{ display: "block" }}>
                            {item.name}
                          </Text>
                          <Text type="secondary">Đã bán: {item.sold}</Text>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="Chưa có dữ liệu sản phẩm bán chạy" />
              )}
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              title="Tỉ lệ tồn kho theo loại"
              style={{
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                border: "none",
                height: "400px",
              }}
              bodyStyle={{
                height: "320px",
                padding: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {stockByType.length > 0 ? (
                <div style={{ width: "100%", height: "100%" }}>
                  <Pie {...pieConfig} />
                </div>
              ) : (
                <Empty description="Không có dữ liệu tồn kho" />
              )}
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <WarningOutlined style={{ color: "#ff4d4f" }} />
                  <span>Cảnh báo tồn kho thấp</span>
                </div>
              }
              style={{
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                border: "none",
                height: "400px",
              }}
              bodyStyle={{ height: "320px", overflow: "auto" }}
            >
              {lowStockProducts.length > 0 ? (
                <List
                  dataSource={lowStockProducts}
                  renderItem={(item) => (
                    <List.Item style={{ padding: "12px 0" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          width: "100%",
                        }}
                      >
                        <WarningOutlined
                          style={{ color: "#ff4d4f", fontSize: 16 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text strong ellipsis style={{ display: "block" }}>
                            {item.name}
                          </Text>
                          <Tag color="error" size="small">
                            Còn lại: {item.quantity}
                          </Tag>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Text type="secondary">
                    Tất cả sản phẩm đều có tồn kho đủ
                  </Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
    // </div>
  );
};

export default Dashboard;
