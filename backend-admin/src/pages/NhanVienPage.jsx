import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, message } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';

const NhanVienPage = () => {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    const res = await axios.get('http://localhost:3001/api/nhanvien');
    setList(res.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFinish = async (values) => {
    const data = {
      ...values,
      ngaysinh: values.ngaysinh.format('YYYY-MM-DD'),
    };

    try {
      if (editing) {
        await axios.put(`http://localhost:3001/api/nhanvien/${editing.id}`, data);
        message.success('Cập nhật thành công!');
      } else {
        await axios.post(`http://localhost:3001/api/nhanvien`, data);
        message.success('Thêm thành công!');
      }
      form.resetFields();
      setOpen(false);
      setEditing(null);
      fetchData();
    } catch (err) {
      message.error('Lỗi khi lưu!');
    }
  };

  const handleEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      ngaysinh: dayjs(record.ngaysinh),
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:3001/api/nhanvien/${id}`);
      message.success('Đã xóa!');
      fetchData();
    } catch (err) {
      message.error('Lỗi khi xóa!');
    }
  };

  return (
    <div className="p-4">
      <Button type="primary" onClick={() => { form.resetFields(); setEditing(null); setOpen(true); }}>
        Thêm nhân viên
      </Button>

      <Table dataSource={list} rowKey="id" className="mt-4"
        columns={[
          { title: 'Tên', dataIndex: 'ten' },
          { title: 'SĐT', dataIndex: 'sdt' },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Địa chỉ', dataIndex: 'diachi' },
          { title: 'Ngày sinh', dataIndex: 'ngaysinh', render: d => dayjs(d).format('DD/MM/YYYY') },
          {
            title: 'Hành động',
            render: (_, record) => (
              <>
                <Button onClick={() => handleEdit(record)} className="mr-2">Sửa</Button>
                <Button danger onClick={() => handleDelete(record.id)}>Xóa</Button>
              </>
            )
          }
        ]}
      />

      <Modal title={editing ? "Cập nhật nhân viên" : "Thêm nhân viên"} open={open} onCancel={() => setOpen(false)} onOk={form.submit}>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="ten" label="Tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sdt" label="SĐT" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="diachi" label="Địa chỉ">
            <Input />
          </Form.Item>
          <Form.Item name="ngaysinh" label="Ngày sinh" rules={[{ required: true }]}>
            <DatePicker format="DD/MM/YYYY" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NhanVienPage;
