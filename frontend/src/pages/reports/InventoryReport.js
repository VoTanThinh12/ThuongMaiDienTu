import React, { useState, useEffect } from 'react';
import { Table, message } from 'antd';
import api from '../../utils/api';
// import MainLayout from '../../components/MainLayout';

const InventoryReport = () => {
  const [inventory, setInventory] = useState([]);
  
  const fetchInventory = async () => {
    try {
      const response = await api.get('/baocao/tonkho');
      setInventory(response.data);
    } catch (error) {
      message.error('Lỗi khi tải báo cáo tồn kho');
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const columns = [
    { title: 'Tên sản phẩm', dataIndex: 'ten_san_pham', key: 'ten_san_pham' },
    { title: 'Mã sản phẩm', dataIndex: 'ma_san_pham', key: 'ma_san_pham' },
    { title: 'Số lượng tồn', dataIndex: 'so_luong', key: 'so_luong' },
    { title: 'Giá bán', dataIndex: 'gia_ban', key: 'gia_ban' },
  ];

  return (
    <div>
      <h2>Báo cáo Tồn kho</h2>
      <Table columns={columns} dataSource={inventory} rowKey="id" />
    </div>
  );
};

export default InventoryReport;