/**
 * Script test hệ thống thanh toán ngân hàng
 * Chạy: node test_bank_payment_system.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test data
const testOrderId = 'DH001234';
const testAmount = 500000;
const testTransactionId = `bank_${testOrderId}_${Date.now()}`;

async function testBankPaymentSystem() {
  console.log('🚀 Bắt đầu test hệ thống thanh toán ngân hàng...\n');

  try {
    // 1. Test tạo QR payment
    console.log('1. Test tạo QR payment...');
    const createResponse = await axios.post(`${BASE_URL}/api/qr-payment/bank/${testOrderId}`, {
      amount: testAmount,
      orderInfo: `Thanh toan don hang ${testOrderId}`
    }, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    console.log('✅ Tạo QR payment thành công:');
    console.log(`   - Transaction ID: ${createResponse.data.data.transactionId}`);
    console.log(`   - Amount: ${createResponse.data.data.amount}`);
    console.log(`   - Verification Code: ${createResponse.data.data.verificationCode}`);
    console.log(`   - Bank Info: ${createResponse.data.data.bankInfo.accountName} - ${createResponse.data.data.bankInfo.accountNumber}\n`);

    // 2. Test kiểm tra trạng thái
    console.log('2. Test kiểm tra trạng thái...');
    const statusResponse = await axios.get(`${BASE_URL}/api/qr-payment/status/${createResponse.data.data.transactionId}`);
    console.log('✅ Kiểm tra trạng thái thành công:');
    console.log(`   - Status: ${statusResponse.data.data.status}\n`);

    // 3. Test lấy danh sách giao dịch chờ xác nhận (admin)
    console.log('3. Test lấy danh sách giao dịch chờ xác nhận...');
    const pendingResponse = await axios.get(`${BASE_URL}/api/qr-payment/pending-bank`, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✅ Lấy danh sách giao dịch thành công:');
    console.log(`   - Số giao dịch chờ xác nhận: ${pendingResponse.data.data.length}\n`);

    // 4. Test upload sao kê ngân hàng
    console.log('4. Test upload sao kê ngân hàng...');
    const statementContent = `
SAO KÊ TÀI KHOẢN NGÂN HÀNG
Tài khoản: 1027077985
Tên tài khoản: PHAN HOAI THAN
Ngân hàng: Vietcombank

01/01/2024  500000  Chuyen tien don hang ${testOrderId}
02/01/2024  750000  Thanh toan don hang DH001235
    `;

    const uploadResponse = await axios.post(`${BASE_URL}/api/qr-payment/upload-statement`, {
      fileContent: statementContent
    }, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });

    console.log('✅ Upload sao kê thành công:');
    console.log(`   - Số giao dịch phân tích: ${uploadResponse.data.data.parsedTransactions.length}`);
    console.log(`   - Số giao dịch khớp: ${uploadResponse.data.data.matchedCount}\n`);

    // 5. Test xác minh giao dịch
    console.log('5. Test xác minh giao dịch...');
    const verifyResponse = await axios.post(`${BASE_URL}/api/qr-payment/verify/${createResponse.data.data.transactionId}`, {
      verifiedBy: 'Test Admin'
    }, {
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    });
    console.log('✅ Xác minh giao dịch thành công:');
    console.log(`   - Message: ${verifyResponse.data.message}\n`);

    console.log('🎉 Tất cả test đều thành công!');
    console.log('\n📋 Tóm tắt:');
    console.log('   ✅ Tạo QR payment');
    console.log('   ✅ Kiểm tra trạng thái');
    console.log('   ✅ Lấy danh sách giao dịch');
    console.log('   ✅ Upload sao kê ngân hàng');
    console.log('   ✅ Xác minh giao dịch');

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
testBankPaymentSystem();

