import React, { useState } from "react";
import { Form, Input, Button, Card, message } from "antd";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import MainLayout from "../../components/MainLayout";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", values);
      const { token, nhanVien } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("role", nhanVien?.vai_tro || "");
      localStorage.setItem("nvId", nhanVien?.id || "");
      localStorage.setItem("ho_ten", nhanVien?.ho_ten || "");
      localStorage.setItem("tai_khoan", nhanVien?.tai_khoan || "");

      message.success("Đăng nhập thành công");
      const role = (nhanVien?.vai_tro || "").toLowerCase();
      navigate(role === "thu_ngan" ? "/pos" : "/dashboard");
    } catch (err) {
      message.error(err.response?.data?.error || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#f0f2f5",
      }}
    >
      <Card title="Đăng nhập hệ thống" style={{ width: 400 }}>
        <Form name="login" onFinish={onFinish}>
          <Form.Item
            name="tai_khoan"
            rules={[{ required: true, message: "Vui lòng nhập tài khoản!" }]}
          >
            <Input placeholder="Tài khoản" />
          </Form.Item>
          <Form.Item
            name="mat_khau"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
          >
            <Input.Password placeholder="Mật khẩu" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
