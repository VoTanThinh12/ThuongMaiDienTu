import React, { memo, useState, useCallback } from "react";
import { Card, DatePicker, Table, message, Empty } from "antd";
import { UserOutlined, BarChartOutlined } from "@ant-design/icons";
import api from "../../utils/api";
// import MainLayout from '../../components/MainLayout';

const { RangePicker } = DatePicker;

// Memoized component
const EmployeePerformanceReport = memo(() => {
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Memoized currency formatter với xử lý số an toàn
  const formatCurrency = useCallback((amount) => {
    // Chuyển đổi về number và kiểm tra tính hợp lệ
    const numericAmount =
      typeof amount === "string" ? parseFloat(amount) : Number(amount);

    if (!numericAmount || isNaN(numericAmount) || numericAmount === 0) {
      return "0 ₫";
    }

    // Đảm bảo số không quá lớn
    if (numericAmount > Number.MAX_SAFE_INTEGER) {
      console.warn("Amount too large for safe calculation:", numericAmount);
      return "N/A ₫";
    }

    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  }, []);

  // Memoized fetch function
  const fetchPerformanceReport = useCallback(async (dates) => {
    if (!dates || dates.length !== 2) {
      return message.error("Vui lòng chọn khoảng thời gian!");
    }

    const [startDate, endDate] = dates;
    setLoading(true);
    setHasGenerated(true);
    setDateRange(dates);

    try {
      const response = await api.get("/baocao/hieusuatnhanvien", {
        params: {
          startDate: startDate.format("YYYY-MM-DD"),
          endDate: endDate.format("YYYY-MM-DD"),
        },
      });

      // Validate response data
      if (response.data && Array.isArray(response.data)) {
        // Debug logging để kiểm tra dữ liệu thô
        console.log("Raw performance data:", response.data);

        // Validate và clean dữ liệu
        const cleanedData = response.data.map((record, index) => {
          const revenue =
            record?._sum?.tong_tien || record?.tong_doanh_thu || 0;
          const invoiceCount = record?._count?.id || record?.so_hoa_don || 0;

          console.log(`Record ${index}:`, {
            id_nhan_vien: record.id_nhan_vien,
            revenue: revenue,
            invoiceCount: invoiceCount,
            revenueType: typeof revenue,
          });

          return {
            ...record,
            // Đảm bảo dữ liệu số được parse đúng
            _sum: {
              ...record._sum,
              tong_tien:
                typeof revenue === "string"
                  ? parseFloat(revenue)
                  : Number(revenue),
            },
            _count: {
              ...record._count,
              id:
                typeof invoiceCount === "string"
                  ? parseInt(invoiceCount)
                  : Number(invoiceCount),
            },
          };
        });

        setPerformanceData(cleanedData);
        message.success(
          `Đã tạo báo cáo hiệu suất cho ${cleanedData.length} nhân viên`
        );
      } else {
        setPerformanceData([]);
        message.warning(
          "Không có dữ liệu hiệu suất trong khoảng thời gian này"
        );
      }
    } catch (error) {
      console.error("Employee performance report error:", error);
      setPerformanceData([]);

      if (error.response?.status === 404) {
        message.warning(
          "Không có dữ liệu hiệu suất trong khoảng thời gian này"
        );
      } else {
        message.error("Lỗi khi lấy báo cáo hiệu suất. Vui lòng thử lại!");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Safe data accessor functions
  const getEmployeeName = useCallback((record) => {
    return (
      record?.nhan_vien?.ho_ten || `Nhân viên #${record?.id_nhan_vien || "N/A"}`
    );
  }, []);

  const getInvoiceCount = useCallback((record) => {
    return record?._count?.id || record?.so_hoa_don || 0;
  }, []);

  const getTotalRevenue = useCallback((record) => {
    const revenue = record?._sum?.tong_tien || record?.tong_doanh_thu || 0;
    // Chuyển đổi về number và đảm bảo an toàn
    const numericRevenue =
      typeof revenue === "string" ? parseFloat(revenue) : Number(revenue);
    return isNaN(numericRevenue) ? 0 : numericRevenue;
  }, []);

  const columns = [
    {
      title: "ID",
      dataIndex: "id_nhan_vien",
      key: "id_nhan_vien",
      width: 80,
      align: "center",
      render: (id) => (
        <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>
          #{id || "N/A"}
        </span>
      ),
    },
    {
      title: "Họ tên nhân viên",
      key: "ho_ten",
      render: (_, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <UserOutlined style={{ color: "#1890ff" }} />
          <span style={{ fontWeight: "500" }}>{getEmployeeName(record)}</span>
        </div>
      ),
    },
    {
      title: "Số hóa đơn",
      key: "so_hoa_don",
      width: 120,
      align: "center",
      render: (_, record) => {
        const count = getInvoiceCount(record);
        return (
          <span
            style={{
              fontWeight: "bold",
              color: count > 0 ? "#1890ff" : "#999",
            }}
          >
            {count}
          </span>
        );
      },
    },
    {
      title: "Tổng doanh thu",
      key: "tong_doanh_thu",
      width: 160,
      align: "right",
      render: (_, record) => {
        const revenue = getTotalRevenue(record);
        return (
          <span
            style={{
              fontWeight: "bold",
              color: revenue > 0 ? "#52c41a" : "#999",
              fontSize: "14px",
            }}
          >
            {formatCurrency(revenue)}
          </span>
        );
      },
    },
    {
      title: "Trung bình/HĐ",
      key: "trung_binh",
      width: 140,
      align: "right",
      render: (_, record) => {
        const revenue = getTotalRevenue(record);
        const count = getInvoiceCount(record);
        const average = count > 0 ? revenue / count : 0;

        return (
          <span
            style={{
              color: "#666",
              fontSize: "13px",
              fontStyle: count === 0 ? "italic" : "normal",
            }}
          >
            {count > 0 ? formatCurrency(average) : "N/A"}
          </span>
        );
      },
    },
  ];

  // Calculate totals với xử lý an toàn
  const totals = React.useMemo(() => {
    console.log("Calculating totals for performanceData:", performanceData);

    const result = performanceData.reduce(
      (acc, record, index) => {
        const invoiceCount = getInvoiceCount(record);
        const revenue = getTotalRevenue(record);

        // Đảm bảo các giá trị là số hợp lệ
        const safeInvoiceCount = isNaN(invoiceCount) ? 0 : Number(invoiceCount);
        const safeRevenue = isNaN(revenue) ? 0 : Number(revenue);

        console.log(`Processing record ${index}:`, {
          invoiceCount: safeInvoiceCount,
          revenue: safeRevenue,
          accBefore: { ...acc },
        });

        // Kiểm tra overflow
        if (acc.totalRevenue + safeRevenue > Number.MAX_SAFE_INTEGER) {
          console.warn("Revenue calculation overflow detected!");
          return acc; // Không cộng thêm nếu quá lớn
        }

        acc.totalInvoices += safeInvoiceCount;
        acc.totalRevenue += safeRevenue;

        console.log(`After processing record ${index}:`, { ...acc });

        return acc;
      },
      { totalInvoices: 0, totalRevenue: 0 }
    );

    console.log("Final totals:", result);
    return result;
  }, [performanceData, getInvoiceCount, getTotalRevenue]);

  return (
    <div>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "24px",
            gap: "12px",
          }}
        >
          <BarChartOutlined style={{ fontSize: "24px", color: "#1890ff" }} />
          <h2 style={{ margin: 0, fontSize: "24px", color: "#262626" }}>
            Báo cáo Hiệu suất Nhân viên
          </h2>
        </div>

        <Card style={{ marginBottom: 24 }} title="Chọn khoảng thời gian">
          <div style={{ marginBottom: "16px" }}>
            <p style={{ marginBottom: "12px", color: "#666" }}>
              Chọn khoảng thời gian để xem báo cáo hiệu suất bán hàng của từng
              nhân viên.
            </p>
            <RangePicker
              onChange={fetchPerformanceReport}
              format="DD/MM/YYYY"
              placeholder={["Ngày bắt đầu", "Ngày kết thúc"]}
              style={{ width: "100%", maxWidth: "400px" }}
              size="large"
            />
          </div>
        </Card>

        {hasGenerated && (
          <>
            {/* Summary Card */}
            {performanceData.length > 0 && (
              <Card
                style={{ marginBottom: 24 }}
                title={
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <BarChartOutlined />
                    <span>Tổng quan hiệu suất</span>
                    {dateRange && (
                      <span
                        style={{
                          fontSize: "14px",
                          color: "#666",
                          fontWeight: "normal",
                        }}
                      >
                        ({dateRange[0]?.format("DD/MM/YYYY")} -{" "}
                        {dateRange[1]?.format("DD/MM/YYYY")})
                      </span>
                    )}
                  </div>
                }
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "24px",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#1890ff",
                      }}
                    >
                      {performanceData.length}
                    </div>
                    <div style={{ color: "#666" }}>Nhân viên có doanh số</div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#1890ff",
                      }}
                    >
                      {totals.totalInvoices}
                    </div>
                    <div style={{ color: "#666" }}>Tổng hóa đơn</div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "24px",
                        fontWeight: "bold",
                        color: "#52c41a",
                      }}
                    >
                      {formatCurrency(totals.totalRevenue)}
                    </div>
                    <div style={{ color: "#666" }}>Tổng doanh thu</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Data Table */}
            <Card title="Chi tiết hiệu suất nhân viên">
              <Table
                columns={columns}
                dataSource={performanceData}
                rowKey="id_nhan_vien"
                loading={loading}
                locale={{
                  emptyText: (
                    <Empty
                      description="Không có dữ liệu hiệu suất trong khoảng thời gian này"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ),
                }}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} của ${total} nhân viên`,
                }}
                scroll={{ x: 600 }}
                summary={() => {
                  if (performanceData.length === 0) return null;

                  return (
                    <Table.Summary.Row style={{ backgroundColor: "#fafafa" }}>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <strong>TỔNG CỘNG</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="center">
                        <strong style={{ color: "#1890ff" }}>
                          {totals.totalInvoices}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right">
                        <strong style={{ color: "#52c41a" }}>
                          {formatCurrency(totals.totalRevenue)}
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right">
                        <strong style={{ color: "#666" }}>
                          {totals.totalInvoices > 0
                            ? formatCurrency(
                                totals.totalRevenue / totals.totalInvoices
                              )
                            : "N/A"}
                        </strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  );
                }}
              />
            </Card>
          </>
        )}

        {!hasGenerated && (
          <Card style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ color: "#999", fontSize: "16px" }}>
              <BarChartOutlined
                style={{
                  fontSize: "48px",
                  marginBottom: "16px",
                  display: "block",
                }}
              />
              Chọn khoảng thời gian để xem báo cáo hiệu suất nhân viên
            </div>
          </Card>
        )}
      </div>
    </div>
  );
});

// Set displayName cho debugging
EmployeePerformanceReport.displayName = "EmployeePerformanceReport";

export default EmployeePerformanceReport;
