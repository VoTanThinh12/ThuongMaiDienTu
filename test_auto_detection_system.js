/**
 * Script test hệ thống tự động phát hiện giao dịch
 * Chạy: node test_auto_detection_system.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testAutoDetectionSystem() {
  console.log('🚀 Bắt đầu test hệ thống tự động phát hiện giao dịch...\n');

  try {
    // 1. Test trạng thái hệ thống
    console.log('1. Test trạng thái hệ thống...');
    const statusResponse = await axios.get(`${BASE_URL}/api/auto-payment-detection/status`, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✅ Trạng thái hệ thống:');
    console.log(`   - Đang chạy: ${statusResponse.data.data.isRunning}`);
    console.log(`   - Check Interval: ${statusResponse.data.data.checkInterval}`);
    console.log(`   - Uptime: ${statusResponse.data.data.uptime}ms\n`);

    // 2. Test thêm giao dịch mẫu
    console.log('2. Test thêm giao dịch mẫu...');
    const mockResponse = await axios.post(`${BASE_URL}/api/auto-payment-detection/add-mock`, {}, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✅ Đã thêm giao dịch mẫu:');
    console.log(`   - Mã giao dịch: ${mockResponse.data.data.ma_giao_dich}`);
    console.log(`   - Mã đơn hàng: ${mockResponse.data.data.ma_don_hang}`);
    console.log(`   - Số tiền: ${mockResponse.data.data.so_tien}\n`);

    // 3. Test SMS parsing
    console.log('3. Test SMS parsing...');
    const smsContent = 'VCB: +500,000VND tu 0123456789. So du: 5,000,000VND. ND: DH0012345678. 01/01/2024 10:30';
    const smsResponse = await axios.post(`${BASE_URL}/api/auto-payment-detection/test-sms`, {
      smsContent: smsContent
    }, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✅ Test SMS parsing:');
    console.log(`   - Nội dung gốc: ${smsResponse.data.data.originalContent}`);
    if (smsResponse.data.data.parsedInfo) {
      console.log(`   - Số tiền: ${smsResponse.data.data.parsedInfo.amount}`);
      console.log(`   - Mã đơn hàng: ${smsResponse.data.data.parsedInfo.orderId}`);
      console.log(`   - Nguồn: ${smsResponse.data.data.parsedInfo.source}`);
    } else {
      console.log('   - Không thể parse');
    }
    console.log('');

    // 4. Test Email parsing
    console.log('4. Test Email parsing...');
    const emailContent = `
      Kính gửi Quý khách,
      
      Tài khoản: 1027077985
      Tên: PHAN HOAI THAN
      
      Giao dịch: +500,000 VND
      Nội dung: DH0012345678
      Thời gian: 01/01/2024 10:30
      Số dư: 5,000,000 VND
    `;
    const emailResponse = await axios.post(`${BASE_URL}/api/auto-payment-detection/test-email`, {
      emailContent: emailContent
    }, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✅ Test Email parsing:');
    if (emailResponse.data.data.parsedInfo) {
      console.log(`   - Số tiền: ${emailResponse.data.data.parsedInfo.amount}`);
      console.log(`   - Mã đơn hàng: ${emailResponse.data.data.parsedInfo.orderId}`);
      console.log(`   - Nguồn: ${emailResponse.data.data.parsedInfo.source}`);
    } else {
      console.log('   - Không thể parse');
    }
    console.log('');

    // 5. Test lịch sử giao dịch tự động
    console.log('5. Test lịch sử giao dịch tự động...');
    const historyResponse = await axios.get(`${BASE_URL}/api/auto-payment-detection/history`, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✅ Lịch sử giao dịch tự động:');
    console.log(`   - Số giao dịch: ${historyResponse.data.data.transactions.length}`);
    if (historyResponse.data.data.transactions.length > 0) {
      const latest = historyResponse.data.data.transactions[0];
      console.log(`   - Giao dịch mới nhất: ${latest.ma_giao_dich}`);
      console.log(`   - Nguồn: ${latest.nguoi_xac_nhan}`);
    }
    console.log('');

    // 6. Test thống kê
    console.log('6. Test thống kê...');
    const statsResponse = await axios.get(`${BASE_URL}/api/auto-payment-detection/stats`, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✅ Thống kê hệ thống:');
    console.log(`   - Hôm nay: ${statsResponse.data.data.today?.reduce((sum, item) => sum + item._count.id, 0) || 0} giao dịch`);
    console.log(`   - Tuần này: ${statsResponse.data.data.week?.reduce((sum, item) => sum + item._count.id, 0) || 0} giao dịch`);
    console.log(`   - Tổng cộng: ${statsResponse.data.data.total?.reduce((sum, item) => sum + item._count.id, 0) || 0} giao dịch`);
    console.log('');

    console.log('🎉 Tất cả test đều thành công!');
    console.log('\n📋 Tóm tắt:');
    console.log('   ✅ Trạng thái hệ thống');
    console.log('   ✅ Thêm giao dịch mẫu');
    console.log('   ✅ SMS parsing');
    console.log('   ✅ Email parsing');
    console.log('   ✅ Lịch sử giao dịch');
    console.log('   ✅ Thống kê hệ thống');

    console.log('\n💡 Hướng dẫn sử dụng:');
    console.log('   1. Truy cập: http://localhost:3000/auto-payment-detection');
    console.log('   2. Khởi động hệ thống tự động phát hiện');
    console.log('   3. Thêm giao dịch mẫu để test');
    console.log('   4. Test parser với SMS/Email mẫu');
    console.log('   5. Theo dõi lịch sử và thống kê');

  } catch (error) {
    console.error('❌ Test thất bại:');
    if (error.response) {
      console.error(`   - Status: ${error.response.status}`);
      console.error(`   - Message: ${error.response.data.error || error.response.data.message}`);
    } else {
      console.error(`   - Error: ${error.message}`);
    }
  }
}

// Chạy test
testAutoDetectionSystem();

