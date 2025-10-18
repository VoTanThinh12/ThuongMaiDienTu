import React, { useState } from 'react';
import { Modal, Form, Input, Select, Button, message } from 'antd';
import { orderAPI } from '../utils/api';

const EditOrderModal = ({ order, visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Gọi API để cập nhật đơn hàng
      await orderAPI.updateOrder(order.id, values);
      message.success('Cập nhật đơn hàng thành công!');
      onSuccess();
      onCancel();
    } catch (error) {
      message.error(error.response?.data?.error || 'Cập nhật thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Chỉnh sửa đơn hàng"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ho_ten_nguoi_nhan: order?.ho_ten_nguoi_nhan,
          so_dien_thoai: order?.so_dien_thoai,
          dia_chi_giao_hang: order?.dia_chi_giao_hang,
          phuong_thuc_thanh_toan: order?.phuong_thuc_thanh_toan,
          ghi_chu: order?.ghi_chu
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="ho_ten_nguoi_nhan"
          label="Họ tên người nhận"
          rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="so_dien_thoai"
          label="Số điện thoại"
          rules={[
            { required: true, message: 'Vui lòng nhập số điện thoại!' },
            { pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại không hợp lệ!' }
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="dia_chi_giao_hang"
          label="Địa chỉ giao hàng"
          rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>

        <Form.Item
          name="phuong_thuc_thanh_toan"
          label="Phương thức thanh toán"
          rules={[{ required: true, message: 'Vui lòng chọn phương thức thanh toán!' }]}
        >
          <Select>
            <Select.Option value="cod">Thanh toán khi nhận hàng (COD)</Select.Option>
            <Select.Option value="bank_transfer">Chuyển khoản ngân hàng</Select.Option>
            <Select.Option value="vnpay">VNPay</Select.Option>
            <Select.Option value="momo">MoMo</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="ghi_chu"
          label="Ghi chú"
        >
          <Input.TextArea rows={2} placeholder="Ghi chú thêm cho đơn hàng..." />
        </Form.Item>

        <Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button onClick={onCancel}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Cập nhật
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditOrderModal;
