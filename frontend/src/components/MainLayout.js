import React, { useState, useMemo } from "react";
import { Layout, Menu, theme } from "antd";
import {
  UserOutlined,
  ShoppingOutlined,
  BarChartOutlined,
  FileTextOutlined,
  DashboardOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";

const { Sider, Content } = Layout;

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState(() => {
    return location.pathname.startsWith("/baocao") ? ["baocao-sub"] : [];
  });
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Lấy vai trò từ localStorage
  const userRole = localStorage.getItem("role");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Tạo menu dựa trên vai trò
  const menuItems = useMemo(() => {
    const baseItems = [
      { key: "/logout", label: "Đăng xuất", onClick: handleLogout },
    ];

    if (userRole === "thu_ngan") {
      return [
        { key: "/pos", icon: <DollarOutlined />, label: "POS" },
        {
          key: "/pos/orders",
          icon: <FileTextOutlined />,
          label: "Hóa Đơn Hôm Nay",
        },
        ...baseItems,
      ];
    }

    // Menu mặc định cho quản lý và các vai trò khác
    return [
      { key: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
      {
        key: "/sanpham",
        icon: <ShoppingOutlined />,
        label: "Quản lý Sản phẩm",
      },
      { key: "/nhanvien", icon: <UserOutlined />, label: "Quản lý Nhân viên" },
      {
        key: "baocao-sub",
        icon: <BarChartOutlined />,
        label: "Báo cáo & Thống kê",
        children: [
          { key: "/baocao/doanhthu", label: "Doanh thu" },
          { key: "/baocao/tonkho", label: "Tồn kho" },
          { key: "/baocao/hieusuatnhanvien", label: "Hiệu suất nhân viên" },
        ],
      },
      { key: "/hoadonban", icon: <FileTextOutlined />, label: "Hóa đơn bán" },
      ...baseItems,
    ];
  }, [userRole]); // Chỉ tạo lại menu khi vai trò thay đổi

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible style={{ position: 'fixed', height: '100vh', left: 0, top: 0, bottom: 0 }}>
        <div className="demo-logo-vertical" />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          items={menuItems}
          onClick={({ key }) => {
            if (key !== "baocao-sub" && key !== "/logout") {
              navigate(key);
            }
          }}
        />
      </Sider>
      <Layout style={{ marginLeft: 200 }}>
        <Content style={{ margin: "24px 16px" }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
