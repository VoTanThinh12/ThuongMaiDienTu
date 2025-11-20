import React, { useState, useCallback } from 'react';
import { Card, DatePicker, message, Skeleton } from 'antd';
import dayjs from 'dayjs';
import api from '../../utils/api';
// import MainLayout from '../../components/MainLayout';

const { RangePicker } = DatePicker;

const RevenueReport = () => {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Memoized currency formatter để sử dụng lại và tránh re-render không cần thiết
  const formatCurrency = useCallback((amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }, []);

  const handleGenerateReport = async (dates) => {
    if (!dates || dates.length !== 2) {
      return message.error('Vui lòng chọn khoảng thời gian!');
    }
    const [startDate, endDate] = dates;
    setLoading(true);
    setHasGenerated(true);
    setTotalRevenue(0); // Reset doanh thu khi bắt đầu tải

    try {
      const response = await api.get('/baocao/doanhthu', {
        params: {
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
        },
      });
      setTotalRevenue(response.data.tong_doanh_thu);
    } catch (error) {
      console.error("Lỗi API báo cáo doanh thu:", error);
      message.error('Lỗi khi tính doanh thu. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Báo cáo Doanh thu</h2>

      <Card style={{ marginBottom: 20 }}>
        <p>Chọn khoảng thời gian để xem báo cáo doanh thu.</p>
        <RangePicker onChange={handleGenerateReport} />
      </Card>

      {hasGenerated && (
        <Card title="Tổng Doanh Thu">
          {loading ? (
            <Skeleton active paragraph={{ rows: 1 }} />
          ) : (
            <p style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
              {formatCurrency(totalRevenue)}
            </p>
          )}
        </Card>
      )}
    </div>
  );
};

export default RevenueReport;