import React, { useEffect, useMemo, useState } from "react";
import {
  DatePicker,
  Table,
  Button,
  Space,
  message,
  Typography,
  Modal,
  Card,
  Statistic,
  Badge,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Col,
  Tag,
} from "antd";
import {
  CalendarOutlined,
  ReloadOutlined,
  EyeOutlined,
  DollarOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  FilePdfOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import api from "../../utils/api";

const { Text } = Typography;

const MyOrders = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(dayjs());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState(null);
  
  // States for return functionality
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnForm] = Form.useForm();
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnHistory, setReturnHistory] = useState([]);
  
  const hoTen = localStorage.getItem("ho_ten") || "Tên Nhân Viên";

  const load = async (d) => {
    const theDate = d || date;
    setLoading(true);
    try {
      const res = await api.get("/hoadonban/cua-toi", {
        params: { date: theDate.format("YYYY-MM-DD") },
      });
      setRows(res.data || []);
    } catch (e) {
      message.error(e.response?.data?.error || "Không tải được danh sách");
    } finally {
      setLoading(false);
    }
  };

  // PDF download function
  const handleDownloadPDF = async (billId) => {
    try {
      message.loading({ content: 'Đang tạo file PDF...', key: 'pdf' });
      
      const response = await api.get(`/hoadonban/${billId}/pdf`, {
        responseType: 'blob',
      });
      
      // Tạo URL cho file blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      // Tạo link download và click tự động
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `hoa-don-${billId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success({ content: 'Tải xuống PDF thành công!', key: 'pdf' });
    } catch (error) {
      console.error('Lỗi khi tải PDF:', error);
      message.error({ content: 'Lỗi khi tải file PDF', key: 'pdf' });
    }
  };

  // Return functionality
  const fetchReturnHistory = async (billId) => {
    try {
      const response = await api.get(`/hoantra/hoadon/${billId}`);
      setReturnHistory(response.data);
    } catch (error) {
      console.error('Lỗi khi tải lịch sử hoàn trả:', error);
    }
  };

  const handleOpenReturnModal = () => {
    // Khởi tạo danh sách sản phẩm có thể hoàn trả
    const items = detailOrder.chi_tiet_hoa_don_ban.map(item => ({
      ...item,
      so_luong_hoan: 0,
      ly_do_hoan: '',
      max_return: item.so_luong // Sẽ tính toán lại dựa trên lịch sử hoàn trả
    }));
    
    setReturnItems(items);
    setIsReturnModalOpen(true);
    fetchReturnHistory(detailOrder.id);
  };

  const calculateMaxReturnQuantity = (itemId, originalQuantity) => {
    const returned = returnHistory.reduce((total, returnRecord) => {
      const returnedItem = returnRecord.chi_tiet_hoan_tra.find(
        ct => ct.id_chi_tiet_hoa_don === itemId
      );
      return total + (returnedItem ? returnedItem.so_luong_hoan : 0);
    }, 0);
    
    return Math.max(0, originalQuantity - returned);
  };

  const handleReturnQuantityChange = (itemId, quantity) => {
    setReturnItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, so_luong_hoan: quantity }
          : item
      )
    );
  };

  const handleReturnReasonChange = (itemId, reason) => {
    setReturnItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, ly_do_hoan: reason }
          : item
      )
    );
  };

  const handleSubmitReturn = async (values) => {
    const itemsToReturn = returnItems.filter(item => item.so_luong_hoan > 0);
    
    if (itemsToReturn.length === 0) {
      message.error('Vui lòng chọn ít nhất một sản phẩm để hoàn trả');
      return;
    }

    setReturnLoading(true);
    try {
      const returnData = {
        id_hoa_don: detailOrder.id,
        ly_do: values.ly_do || '',
        chi_tiet_hoan_tra: itemsToReturn.map(item => ({
          id_chi_tiet_hoa_don: item.id,
          so_luong_hoan: item.so_luong_hoan,
          ly_do_hoan: item.ly_do_hoan || ''
        }))
      };

      console.log('Dữ liệu gửi lên:', returnData);
      
      const response = await api.post('/hoantra/tao', returnData);
      
      message.success('Hoàn trả thành công! Kho hàng đã được cập nhật.');
      setIsReturnModalOpen(false);
      returnForm.resetFields();
      setReturnItems([]);
      
      // Refresh return history
      fetchReturnHistory(detailOrder.id);
      
    } catch (error) {
      console.error('Chi tiết lỗi:', error);
      console.error('Response data:', error.response?.data);
      message.error(error.response?.data?.error || 'Lỗi khi tạo phiếu hoàn trả');
    } finally {
      setReturnLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return Number(amount).toLocaleString() + '₫';
  };

  useEffect(() => {
    load(date); /* eslint-disable-next-line */
  }, []);

  const totals = useMemo(() => {
    const count = rows.length;
    const sum = rows.reduce((s, r) => s + Number(r.tong_tien || 0), 0);
    return { count, sum };
  }, [rows]);

  const columns = [
    {
      title: "Mã đơn",
      dataIndex: "id",
      width: 100,
      render: (text) => (
        <Badge count={`#${text}`} style={{ backgroundColor: "#1890ff" }} />
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "ngay_ban",
      width: 180,
      render: (v) => (
        <div>
          <div style={{ fontWeight: "600", color: "#1890ff" }}>
            {new Date(v).toLocaleDateString()}
          </div>
          <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
            {new Date(v).toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      title: "Tổng tiền",
      dataIndex: "tong_tien",
      align: "right",
      width: 140,
      render: (v) => (
        <div style={{ fontSize: "16px", fontWeight: "600", color: "#52c41a" }}>
          {Number(v).toLocaleString()}₫
        </div>
      ),
    },
    {
      title: "Thao tác",
      width: 120,
      render: (_, r) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => {
            setDetailOrder(r);
            setDetailOpen(true);
          }}
          style={{
            borderRadius: "6px",
            backgroundColor: "#1890ff",
            border: "none",
          }}
        >
          Xem
        </Button>
      ),
    },
  ];

  return (
    <div
    // style={{
    //   minHeight: "100vh",
    //   backgroundColor: "#f0f2f5",
    //   padding: "20px",
    // }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header Card */}
        <Card
          style={{
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: "1px solid #d9d9d9",
            marginBottom: "24px",
          }}
          bodyStyle={{ padding: "24px" }}
        >
          <div
            style={{
              background: "#1890ff",
              margin: "-24px -24px 24px -24px",
              padding: "16px 24px",
              borderRadius: "8px 8px 0 0",
              color: "white",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Button
                type="text"
                onClick={() => navigate("/pos")}
                style={{ color: "white", padding: 0 }}
              >
                <ArrowLeftOutlined style={{ fontSize: 18, marginRight: 6 }} />{" "}
                Quay lại
              </Button>
              <h2
                style={{
                  color: "white",
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: "600",
                }}
              >
                <FileTextOutlined style={{ marginRight: "12px" }} />
                📋 Đơn hàng của tôi
              </h2>
            </div>
          </div>

          <Space
            size="large"
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <Space size="middle">
              <div>
                <CalendarOutlined
                  style={{
                    fontSize: "16px",
                    color: "#1890ff",
                    marginRight: "8px",
                  }}
                />
                <DatePicker
                  value={date}
                  onChange={(d) => {
                    setDate(d);
                    load(d);
                  }}
                  size="large"
                  style={{ borderRadius: "8px" }}
                />
              </div>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => load(date)}
                size="large"
                style={{
                  borderRadius: "8px",
                  background:
                    "linear-gradient(45deg, #ffecd2 0%, #fcb69f 100%)",
                  border: "none",
                  color: "#8b4513",
                  fontWeight: "500",
                }}
              >
                Làm mới
              </Button>
            </Space>

            {/* Statistics */}
            <Space size="large">
              <Statistic
                title={
                  <span style={{ color: "#722ed1", fontWeight: "500" }}>
                    <ShoppingOutlined /> Số đơn
                  </span>
                }
                value={totals.count}
                valueStyle={{
                  color: "#722ed1",
                  fontSize: "24px",
                  fontWeight: "700",
                }}
              />
              <Divider type="vertical" style={{ height: "60px" }} />
              <Statistic
                title={
                  <span style={{ color: "#52c41a", fontWeight: "500" }}>
                    <DollarOutlined /> Doanh thu
                  </span>
                }
                value={totals.sum}
                valueStyle={{
                  color: "#52c41a",
                  fontSize: "24px",
                  fontWeight: "700",
                }}
                formatter={(value) =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "₫"
                }
              />
            </Space>
          </Space>
        </Card>

        {/* Table Card */}
        <Card
          style={{
            borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
            border: "none",
          }}
          bodyStyle={{ padding: "24px" }}
        >
          <Table
            rowKey="id"
            loading={loading}
            dataSource={rows}
            columns={columns}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} của ${total} đơn hàng`,
            }}
            style={{
              backgroundColor: "#fafafa",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          />
        </Card>
      </div>

      {/* Modal chi tiết hóa đơn hiện đại */}
      <Modal
        title={
          <div
            style={{
              background: "linear-gradient(90deg, #ff9a9e 0%, #fecfef 100%)",
              margin: "-24px -24px 24px -24px",
              padding: "20px 24px",
              color: "white",
              fontSize: "20px",
              fontWeight: "600",
            }}
          >
            <TrophyOutlined style={{ marginRight: "12px", fontSize: "24px" }} />
            {detailOrder
              ? `🧾 Chi tiết đơn #${detailOrder.id}`
              : "Chi tiết hóa đơn"}
          </div>
        }
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetailOrder(null);
        }}
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                type="primary"
                icon={<FilePdfOutlined />}
                onClick={() => handleDownloadPDF(detailOrder?.id)}
                style={{
                  background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "500",
                  boxShadow: "0 2px 4px rgba(255, 107, 107, 0.3)",
                  transition: "all 0.3s ease",
                }}
              >
                📄 Tải PDF
              </Button>
              
              <Button
                icon={<UndoOutlined />}
                onClick={handleOpenReturnModal}
                style={{
                  background: "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "500",
                  color: "white",
                  boxShadow: "0 2px 4px rgba(82, 196, 26, 0.3)",
                  transition: "all 0.3s ease",
                }}
              >
                🔄 Hoàn trả
              </Button>
            </div>
            
            <Button onClick={() => {
              setDetailOpen(false);
              setDetailOrder(null);
            }}>
              Đóng
            </Button>
          </div>
        }
        width={800}
        style={{ top: 20 }}
        bodyStyle={{ padding: "24px" }}
      >
        {detailOrder ? (
          <div
            style={{
              background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
              padding: "24px",
              borderRadius: "12px",
            }}
          >
            <Space direction="vertical" size="large" style={{ width: "100%" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  backgroundColor: "white",
                  padding: "16px",
                  borderRadius: "8px",
                }}
              >
                <div>
                  <Text strong style={{ color: "#722ed1" }}>
                    👤 Thu ngân:
                  </Text>
                  <br />
                  <Text style={{ fontSize: "16px" }}>
                    {detailOrder.nhan_vien?.ho_ten || hoTen}
                  </Text>
                </div>
                <div>
                  <Text strong style={{ color: "#722ed1" }}>
                    🕐 Thời gian:
                  </Text>
                  <br />
                  <Text style={{ fontSize: "16px" }}>
                    {new Date(detailOrder.ngay_ban).toLocaleString()}
                  </Text>
                </div>
              </div>

              <Table
                rowKey={(r) => `${r.id}-${r.id_san_pham}`}
                dataSource={detailOrder.chi_tiet_hoa_don_ban || []}
                pagination={false}
                size="middle"
                style={{
                  backgroundColor: "white",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
                columns={[
                  {
                    title: "Sản phẩm",
                    dataIndex: ["san_pham", "ten_san_pham"],
                    render: (text) => (
                      <Text strong style={{ color: "#1890ff" }}>
                        {text}
                      </Text>
                    ),
                  },
                  {
                    title: "SL",
                    dataIndex: "so_luong",
                    align: "center",
                    width: 80,
                    render: (text) => (
                      <Badge
                        count={text}
                        style={{ backgroundColor: "#52c41a" }}
                      />
                    ),
                  },
                  {
                    title: "Đơn giá",
                    dataIndex: "don_gia",
                    align: "right",
                    width: 120,
                    render: (v) => (
                      <Text style={{ color: "#fa8c16", fontWeight: "500" }}>
                        {Number(v).toLocaleString()}₫
                      </Text>
                    ),
                  },
                  {
                    title: "Thành tiền",
                    align: "right",
                    width: 140,
                    render: (_, r) => (
                      <Text
                        style={{
                          color: "#52c41a",
                          fontWeight: "600",
                          fontSize: "15px",
                        }}
                      >
                        {(Number(r.don_gia) * r.so_luong).toLocaleString()}₫
                      </Text>
                    ),
                  },
                ]}
              />

              <div
                style={{
                  backgroundColor: "white",
                  padding: "20px",
                  borderRadius: "8px",
                  textAlign: "right",
                }}
              >
                <Space
                  direction="vertical"
                  size="middle"
                  style={{ width: "100%" }}
                >
                  {/* 1. Tiền khách đưa */}
                  <div style={{ fontSize: "16px" }}>
                    <Text strong style={{ color: "#52c41a" }}>
                      💵 Tiền khách đưa:{" "}
                    </Text>
                    <Text style={{ fontWeight: "600" }}>
                      {Number(detailOrder.tien_khach_dua).toLocaleString()}₫
                    </Text>
                  </div>

                  {/* 2. Tiền thối (đã bỏ viền) */}
                  <div style={{ fontSize: "18px" }}>
                    <Text strong style={{ color: "#389e0d" }}>
                      💸 Tiền thối:{" "}
                    </Text>
                    <Text
                      style={{
                        // fontSize: "20px",
                        fontWeight: "600",
                        // color: "#389e0d",
                      }}
                    >
                      {Number(detailOrder.tien_thoi).toLocaleString()}₫
                    </Text>
                  </div>

                  {/* 3. Tổng tiền (được thêm viền xanh) */}
                  <div
                    style={{
                      fontSize: "18px",
                      padding: "12px",
                      backgroundColor: "#f6ffed",
                      borderRadius: "6px",
                      border: "1px solid #b7eb8f",
                    }}
                  >
                    <Text strong style={{ color: "#1890ff" }}>
                      💰 Tổng tiền:{" "}
                    </Text>
                    <Text
                      style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color: "#f5222d",
                      }}
                    >
                      {Number(detailOrder.tong_tien).toLocaleString()}₫
                    </Text>
                  </div>
                </Space>
              </div>
            </Space>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            Không có chi tiết
          </div>
        )}
      </Modal>

      {/* Modal hoàn trả */}
      <Modal
        title={
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            color: "#52c41a",
            fontSize: "18px",
            fontWeight: "600"
          }}>
            <UndoOutlined />
            Tạo phiếu hoàn trả - Hóa đơn #{detailOrder?.id}
          </div>
        }
        open={isReturnModalOpen}
        onCancel={() => {
          setIsReturnModalOpen(false);
          returnForm.resetFields();
          setReturnItems([]);
        }}
        footer={null}
        width={1200}
        destroyOnClose
      >
        <Form
          form={returnForm}
          layout="vertical"
          onFinish={handleSubmitReturn}
        >
          <Card title="Thông tin hoàn trả" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Lý do hoàn trả chung"
                  name="ly_do"
                >
                  <Input.TextArea 
                    rows={3} 
                    placeholder="Nhập lý do hoàn trả..."
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <div style={{ 
                  background: "#f0f9f0", 
                  padding: "16px", 
                  borderRadius: "8px",
                  border: "1px solid #d9f7be"
                }}>
                  <p style={{ margin: 0, fontWeight: "500", color: "#389e0d" }}>
                    📝 Lưu ý hoàn trả:
                  </p>
                  <ul style={{ marginTop: "8px", paddingLeft: "16px", fontSize: "13px", color: "#666" }}>
                    <li>Chỉ có thể hoàn trả số lượng đã mua</li>
                    <li>Kho hàng sẽ được cập nhật ngay lập tức</li>
                    <li>Hoàn trả sẽ được xử lý tự động</li>
                  </ul>
                </div>
              </Col>
            </Row>
          </Card>

          <Card title="Danh sách sản phẩm hoàn trả" style={{ marginBottom: 16 }}>
            <Table
              dataSource={returnItems}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ y: 300 }}
              columns={[
                {
                  title: "Sản phẩm",
                  dataIndex: "san_pham",
                  key: "san_pham",
                  width: 250,
                  render: (sanPham) => (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div>
                        <div style={{ fontWeight: "500", color: "#1890ff" }}>
                          {sanPham?.ten_san_pham}
                        </div>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                          SKU: {sanPham?.ma_san_pham}
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  title: "Đã mua",
                  dataIndex: "so_luong",
                  key: "so_luong",
                  width: 80,
                  align: "center",
                  render: (quantity) => (
                    <Tag color="blue">{quantity}</Tag>
                  ),
                },
                {
                  title: "Có thể hoàn",
                  key: "max_return",
                  width: 100,
                  align: "center",
                  render: (_, record) => {
                    const maxReturn = calculateMaxReturnQuantity(record.id, record.so_luong);
                    return (
                      <Tag color={maxReturn > 0 ? "green" : "red"}>
                        {maxReturn}
                      </Tag>
                    );
                  },
                },
                {
                  title: "Số lượng hoàn",
                  key: "so_luong_hoan",
                  width: 120,
                  align: "center",
                  render: (_, record) => {
                    const maxReturn = calculateMaxReturnQuantity(record.id, record.so_luong);
                    return (
                      <InputNumber
                        min={0}
                        max={maxReturn}
                        value={record.so_luong_hoan}
                        onChange={(value) => handleReturnQuantityChange(record.id, value || 0)}
                        style={{ width: "100%" }}
                        disabled={maxReturn === 0}
                      />
                    );
                  },
                },
                {
                  title: "Đơn giá",
                  dataIndex: "don_gia",
                  key: "don_gia",
                  width: 120,
                  align: "right",
                  render: (price) => formatCurrency(price),
                },
                {
                  title: "Thành tiền hoàn",
                  key: "thanh_tien_hoan",
                  width: 140,
                  align: "right",
                  render: (_, record) => {
                    const amount = (record.so_luong_hoan || 0) * (record.don_gia || 0);
                    return (
                      <span style={{ 
                        color: amount > 0 ? "#f5222d" : "#666",
                        fontWeight: amount > 0 ? "500" : "normal"
                      }}>
                        {formatCurrency(amount)}
                      </span>
                    );
                  },
                },
                {
                  title: "Lý do hoàn",
                  key: "ly_do_hoan",
                  width: 200,
                  render: (_, record) => (
                    <Input
                      placeholder="Lý do hoàn sản phẩm này..."
                      value={record.ly_do_hoan}
                      onChange={(e) => handleReturnReasonChange(record.id, e.target.value)}
                      size="small"
                    />
                  ),
                },
              ]}
              summary={() => {
                const totalReturnQuantity = returnItems.reduce((sum, item) => sum + (item.so_luong_hoan || 0), 0);
                const totalReturnAmount = returnItems.reduce((sum, item) => {
                  const amount = (item.so_luong_hoan || 0) * (item.don_gia || 0);
                  return sum + amount;
                }, 0);

                return (
                  <Table.Summary.Row style={{ backgroundColor: "#fff2f0" }}>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <span style={{ fontWeight: "bold", color: "#f5222d" }}>
                        Tổng hoàn trả
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="center">
                      <span style={{ fontWeight: "bold", color: "#f5222d" }}>
                        {totalReturnQuantity}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}></Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <span style={{
                        fontWeight: "bold",
                        color: "#f5222d",
                        fontSize: "16px",
                      }}>
                        {formatCurrency(totalReturnAmount)}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4}></Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />
          </Card>

          {/* Lịch sử hoàn trả */}
          {returnHistory.length > 0 && (
            <Card title="Lịch sử hoàn trả" style={{ marginBottom: 16 }}>
              <Table
                dataSource={returnHistory}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: "Mã phiếu",
                    dataIndex: "id",
                    key: "id",
                    width: 80,
                  },
                  {
                    title: "Ngày tạo",
                    dataIndex: "ngay_tao",
                    key: "ngay_tao",
                    width: 120,
                    render: (date) => dayjs(date).format("DD/MM/YYYY"),
                  },
                  {
                    title: "Trạng thái",
                    dataIndex: "trang_thai",
                    key: "trang_thai",
                    width: 120,
                    render: (status) => {
                      const statusConfig = {
                        CHO_DUYET: { color: "orange", text: "Chờ duyệt" },
                        DA_DUYET: { color: "blue", text: "Đã duyệt" },
                        TU_CHOI: { color: "red", text: "Từ chối" },
                        HOAN_THANH: { color: "green", text: "Hoàn thành" },
                      };
                      const config = statusConfig[status] || { color: "default", text: status };
                      return <Tag color={config.color}>{config.text}</Tag>;
                    },
                  },
                  {
                    title: "Lý do",
                    dataIndex: "ly_do",
                    key: "ly_do",
                    ellipsis: true,
                  },
                  {
                    title: "Chi tiết",
                    key: "chi_tiet",
                    render: (_, record) => (
                      <div style={{ fontSize: "12px" }}>
                        {record.chi_tiet_hoan_tra?.map((item, index) => (
                          <div key={index}>
                            {item.chi_tiet_hoa_don?.san_pham?.ten_san_pham}: {item.so_luong_hoan}
                          </div>
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          )}

          <div style={{ textAlign: "right" }}>
            <Button 
              onClick={() => {
                setIsReturnModalOpen(false);
                returnForm.resetFields();
                setReturnItems([]);
              }}
              style={{ marginRight: 8 }}
            >
              Hủy
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={returnLoading}
              icon={<UndoOutlined />}
              style={{
                background: "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)",
                border: "none",
              }}
            >
              Tạo phiếu hoàn trả
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default MyOrders;
