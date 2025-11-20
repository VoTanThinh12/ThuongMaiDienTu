import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  message,
  Spin,
  Button,
  Modal,
  Descriptions,
  Card,
  DatePicker,
  Space,
  InputNumber,
  Input,
  Form,
  Popconfirm,
  Tag,
  Alert,
  Row,
  Col,
} from "antd";
import {
  FileTextOutlined,
  UnorderedListOutlined,
  SearchOutlined,
  CalendarOutlined,
  FilePdfOutlined,
  UndoOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import api from "../utils/api";
// import MainLayout from "../components/MainLayout";

dayjs.locale("vi");

const Hoadonban = () => {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billDetails, setBillDetails] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchDate, setSearchDate] = useState(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnForm] = Form.useForm();
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnHistory, setReturnHistory] = useState([]);

  const formatCurrency = useCallback((amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  }, []);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const response = await api.get("/hoadonban");
      setBills(response.data);
      setFilteredBills(response.data);
      message.success("Đã tải danh sách hóa đơn thành công!");
    } catch (error) {
      console.error("Lỗi khi tải danh sách hóa đơn:", error);
      message.error("Lỗi khi tải danh sách hóa đơn");
    } finally {
      setLoading(false);
    }
  };

  const fetchBillDetails = async (billId) => {
    setDetailLoading(true);
    try {
      const response = await api.get(`/hoadonban/${billId}/chitiet`);
      setBillDetails(response.data);
    } catch (error) {
      console.error("Lỗi khi tải chi tiết hóa đơn:", error);
      message.error("Lỗi khi tải chi tiết hóa đơn");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewDetails = (record) => {
    setSelectedBill(record);
    setIsDetailModalOpen(true);
    fetchBillDetails(record.id);
  };

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
    const items = billDetails.map(item => ({
      ...item,
      so_luong_hoan: 0,
      ly_do_hoan: '',
      max_return: item.so_luong // Sẽ tính toán lại dựa trên lịch sử hoàn trả
    }));
    
    setReturnItems(items);
    setIsReturnModalOpen(true);
    fetchReturnHistory(selectedBill.id);
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
        id_hoa_don: selectedBill.id,
        ly_do: values.ly_do || '',
        chi_tiet_hoan_tra: itemsToReturn.map(item => ({
          id_chi_tiet_hoa_don: item.id,
          so_luong_hoan: item.so_luong_hoan,
          ly_do_hoan: item.ly_do_hoan || ''
        }))
      };

      await api.post('/hoantra/tao', returnData);
      
      message.success('Hoàn trả thành công! Kho hàng đã được cập nhật.');
      setIsReturnModalOpen(false);
      returnForm.resetFields();
      setReturnItems([]);
      
      // Refresh return history
      fetchReturnHistory(selectedBill.id);
      
    } catch (error) {
      console.error('Lỗi khi tạo phiếu hoàn trả:', error);
      message.error(error.response?.data?.error || 'Lỗi khi tạo phiếu hoàn trả');
    } finally {
      setReturnLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  // Hàm tìm kiếm theo ngày bán
  const handleDateSearch = useCallback(
    (date) => {
      setSearchDate(date);

      if (!date) {
        setFilteredBills(bills);
        return;
      }

      const selectedDate = dayjs(date).format("YYYY-MM-DD");
      const filtered = bills.filter((bill) => {
        const billDate = dayjs(bill.ngay_ban).format("YYYY-MM-DD");
        return billDate === selectedDate;
      });

      setFilteredBills(filtered);
    },
    [bills]
  );

  // Reset search khi bills thay đổi
  useEffect(() => {
    if (!searchDate) {
      setFilteredBills(bills);
    } else {
      handleDateSearch(searchDate);
    }
  }, [bills, searchDate, handleDateSearch]);

  const columns = [
    { title: "ID Hóa đơn", dataIndex: "id", key: "id" },
    {
      title: "Ngày bán",
      dataIndex: "ngay_ban",
      key: "ngay_ban",
      render: (date) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Nhân viên",
      dataIndex: ["nhan_vien", "ho_ten"],
      key: "nhan_vien",
      render: (name) => name || "N/A",
    },
    {
      title: "Tổng tiền",
      dataIndex: "tong_tien",
      key: "tong_tien",
      render: (amount) => (
        <span style={{ fontWeight: "bold", color: "#52c41a" }}>
          {formatCurrency(amount)}
        </span>
      ),
      align: "right",
    },
    {
      title: "",
      key: "action",
      width: 180,
      align: "center",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<UnorderedListOutlined />}
            size="small"
            onClick={() => handleViewDetails(record)}
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              borderRadius: "6px",
              fontWeight: "500",
              boxShadow: "0 2px 4px rgba(102, 126, 234, 0.3)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 4px 8px rgba(102, 126, 234, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 2px 4px rgba(102, 126, 234, 0.3)";
            }}
          >
            Chi tiết
          </Button>
          <Button
            type="default"
            icon={<FilePdfOutlined />}
            size="small"
            onClick={() => handleDownloadPDF(record.id)}
            style={{
              background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
              border: "none",
              borderRadius: "6px",
              fontWeight: "500",
              color: "white",
              boxShadow: "0 2px 4px rgba(255, 107, 107, 0.3)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 4px 8px rgba(255, 107, 107, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 2px 4px rgba(255, 107, 107, 0.3)";
            }}
          >
            PDF
          </Button>
        </Space>
      ),
    },
  ];

  // Columns cho bảng chi tiết sản phẩm
  const detailColumns = [
    {
      title: "STT",
      key: "stt",
      width: 60,
      render: (_, __, index) => index + 1,
      align: "center",
    },
    {
      title: "Mã sản phẩm",
      dataIndex: ["san_pham", "ma_san_pham"],
      key: "ma_san_pham",
      align: "center",
      render: (code) => (
        <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>
          {code || "N/A"}
        </span>
      ),
    },
    {
      title: "Tên sản phẩm",
      dataIndex: ["san_pham", "ten_san_pham"],
      key: "ten_san_pham",
      render: (name) => name || "N/A",
    },
    {
      title: "Đơn vị",
      dataIndex: ["san_pham", "don_vi_tinh"],
      key: "don_vi_tinh",
      align: "center",
      render: (unit) => unit || "N/A",
    },
    {
      title: "Số lượng",
      dataIndex: "so_luong",
      key: "so_luong",
      align: "center",
      render: (quantity) => (
        <span style={{ fontWeight: "bold", color: "#1890ff" }}>
          {quantity || 0}
        </span>
      ),
    },
    {
      title: "Đơn giá",
      dataIndex: "don_gia",
      key: "don_gia",
      align: "right",
      render: (price) => (
        <span style={{ color: "#52c41a" }}>{formatCurrency(price)}</span>
      ),
    },
    {
      title: "Thành tiền",
      key: "thanh_tien",
      align: "right",
      render: (_, record) => {
        const thanhTien = (record.so_luong || 0) * (record.don_gia || 0);
        return (
          <span style={{ fontWeight: "bold", color: "#f5222d" }}>
            {formatCurrency(thanhTien)}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            marginBottom: "24px",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <FileTextOutlined style={{ fontSize: "24px", color: "#1890ff" }} />
            <h2 style={{ margin: 0, fontSize: "24px", color: "#262626" }}>
              Quản lý Hóa đơn Bán
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              <DatePicker
                placeholder="📅 Tìm kiếm theo ngày bán..."
                onChange={handleDateSearch}
                format="DD/MM/YYYY"
                size="large"
                style={{
                  width: 250,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  borderRadius: "8px",
                }}
                allowClear
                suffixIcon={<CalendarOutlined style={{ color: "#1890ff" }} />}
              />
              {searchDate && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "white",
                    border: "1px solid #d9d9d9",
                    borderTop: "none",
                    borderRadius: "0 0 8px 8px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    color: "#666",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    zIndex: 10,
                  }}
                >
                  📅 <strong>{filteredBills.length}</strong> hóa đơn tìm thấy
                  cho ngày {dayjs(searchDate).format("DD/MM/YYYY")}
                </div>
              )}
            </div>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              size="large"
              onClick={() => handleDateSearch(null)}
              disabled={!searchDate}
              style={{
                background: "linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)",
                border: "none",
                boxShadow: "0 4px 12px rgba(24, 144, 255, 0.3)",
                borderRadius: "8px",
                height: "48px",
                padding: "0 24px",
                fontWeight: "bold",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                if (searchDate) {
                  e.target.style.transform = "translateY(-2px)";
                  e.target.style.boxShadow =
                    "0 6px 16px rgba(24, 144, 255, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (searchDate) {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow =
                    "0 4px 12px rgba(24, 144, 255, 0.3)";
                }
              }}
            >
              🔍 Xóa bộ lọc
            </Button>
          </div>
        </div>

        <Card
          style={{
            borderRadius: "16px",
            boxShadow: "0 6px 24px rgba(0, 0, 0, 0.06)",
            border: "1px solid #f0f2f5",
            background: "linear-gradient(135deg, #ffffff 0%, #fafbff 100%)",
          }}
        >
          {/* Hiển thị thông tin tìm kiếm */}
          {searchDate && (
            <div
              style={{
                marginBottom: "20px",
                padding: "16px 20px",
                background: "linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)",
                borderRadius: "12px",
                border: "1px solid #91d5ff",
                boxShadow: "0 2px 8px rgba(24, 144, 255, 0.1)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "3px",
                  background:
                    "linear-gradient(90deg, #1890ff 0%, #36cfc9 100%)",
                }}
              />
              <Space
                align="center"
                style={{ width: "100%", justifyContent: "space-between" }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(24, 144, 255, 0.3)",
                    }}
                  >
                    <CalendarOutlined
                      style={{ color: "white", fontSize: "16px" }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        color: "#1890ff",
                        fontWeight: "bold",
                        fontSize: "15px",
                        marginBottom: "2px",
                      }}
                    >
                      📅 Tìm kiếm theo ngày:{" "}
                      {dayjs(searchDate).format("DD/MM/YYYY")}
                    </div>
                    <div
                      style={{
                        color: "#666",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          background:
                            filteredBills.length > 0 ? "#52c41a" : "#ff4d4f",
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: "bold",
                        }}
                      >
                        {filteredBills.length} hóa đơn
                      </span>
                      <span>trong {bills.length} hóa đơn tổng cộng</span>
                    </div>
                  </div>
                </div>
                <Button
                  type="text"
                  size="small"
                  onClick={() => handleDateSearch(null)}
                  style={{
                    color: "#1890ff",
                    fontWeight: "bold",
                    border: "1px solid #91d5ff",
                    borderRadius: "6px",
                    padding: "4px 12px",
                    height: "auto",
                    background: "white",
                    boxShadow: "0 1px 4px rgba(24, 144, 255, 0.2)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#1890ff";
                    e.target.style.color = "white";
                    e.target.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "white";
                    e.target.style.color = "#1890ff";
                    e.target.style.transform = "translateY(0)";
                  }}
                >
                  ✖️ Xóa bộ lọc
                </Button>
              </Space>
            </div>
          )}
          <Spin spinning={loading}>
            <Table
              columns={columns}
              dataSource={filteredBills}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} của ${total} hóa đơn`,
              }}
              locale={{
                emptyText: searchDate
                  ? `Không tìm thấy hóa đơn nào cho ngày ${dayjs(
                      searchDate
                    ).format("DD/MM/YYYY")}`
                  : "Không có dữ liệu",
              }}
              scroll={{ x: 800 }}
            />
          </Spin>
        </Card>

        {/* Modal chi tiết hóa đơn */}
        <Modal
          title={
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FileTextOutlined />
              Chi tiết Hóa đơn #{selectedBill?.id}
            </div>
          }
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  type="primary"
                  icon={<FilePdfOutlined />}
                  onClick={() => handleDownloadPDF(selectedBill?.id)}
                  style={{
                    background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "500",
                    boxShadow: "0 2px 4px rgba(255, 107, 107, 0.3)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(255, 107, 107, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(255, 107, 107, 0.3)";
                  }}
                >
                  📄 Tải xuống PDF
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(82, 196, 26, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(82, 196, 26, 0.3)";
                  }}
                >
                  🔄 Hoàn trả
                </Button>
              </div>
              
              <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
                Đóng
              </Button>
            </div>
          }
          width={1000}
          destroyOnClose
        >
          {selectedBill && (
            <div>
              {/* Thông tin hóa đơn */}
              <Card
                title="Thông tin hóa đơn"
                style={{ marginBottom: "16px" }}
                size="small"
              >
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Mã hóa đơn">
                    <span
                      style={{ fontFamily: "monospace", fontWeight: "bold" }}
                    >
                      HD{String(selectedBill.id).padStart(6, "0")}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày bán">
                    {dayjs(selectedBill.ngay_ban).format("DD/MM/YYYY HH:mm")}
                  </Descriptions.Item>
                  <Descriptions.Item label="Nhân viên bán hàng">
                    {selectedBill.nhan_vien?.ho_ten || "N/A"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tổng tiền">
                    <span
                      style={{
                        fontWeight: "bold",
                        color: "#f5222d",
                        fontSize: "16px",
                      }}
                    >
                      {formatCurrency(selectedBill.tong_tien)}
                    </span>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {/* Danh sách sản phẩm */}
              <Card title="Danh sách sản phẩm" size="small">
                <Spin spinning={detailLoading}>
                  <Table
                    columns={detailColumns}
                    dataSource={billDetails}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    summary={(pageData) => {
                      const totalQuantity = pageData.reduce(
                        (sum, record) => sum + (record.so_luong || 0),
                        0
                      );
                      const totalAmount = pageData.reduce((sum, record) => {
                        const thanhTien =
                          (record.so_luong || 0) * (record.don_gia || 0);
                        return sum + thanhTien;
                      }, 0);

                      return (
                        <Table.Summary.Row
                          style={{ backgroundColor: "#fafafa" }}
                        >
                          <Table.Summary.Cell index={0} colSpan={4}>
                            <span style={{ fontWeight: "bold" }}>
                              Tổng cộng
                            </span>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="center">
                            <span
                              style={{ fontWeight: "bold", color: "#1890ff" }}
                            >
                              {totalQuantity}
                            </span>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2}></Table.Summary.Cell>
                          <Table.Summary.Cell index={3} align="right">
                            <span
                              style={{
                                fontWeight: "bold",
                                color: "#f5222d",
                                fontSize: "16px",
                              }}
                            >
                              {formatCurrency(totalAmount)}
                            </span>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      );
                    }}
                  />
                </Spin>
              </Card>
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
              Tạo phiếu hoàn trả - Hóa đơn #{selectedBill?.id}
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
                      <li>Kho hàng sẽ được cập nhật tự động</li>
                      <li>Phiếu hoàn trả cần được duyệt bởi quản lý</li>
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
    </div>
  );
};

export default Hoadonban;
