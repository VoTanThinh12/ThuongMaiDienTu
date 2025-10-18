const { PrismaClient } = require('@prisma/client');
const qrPaymentService = require('./qrPayment.service');

const prisma = new PrismaClient();

class MockPaymentSimulatorService {
  constructor() {
    this.isRunning = false;
    this.simulationInterval = null;
    this.startSimulation();
  }

  // Khởi động simulator
  startSimulation() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🎭 Mock Payment Simulator started');
    
    // Simulate payment every 30 seconds
    this.simulationInterval = setInterval(() => {
      this.simulatePayment();
    }, 30000); // 30 seconds
  }

  // Dừng simulator
  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Mock Payment Simulator stopped');
  }

  // Simulate payment
  async simulatePayment() {
    try {
      // Tìm giao dịch chờ xác nhận
      const pendingTransaction = await prisma.giao_dich_ngan_hang.findFirst({
        where: {
          trang_thai: 'cho_xac_nhan',
          thoi_gian_het_han: {
            gt: new Date() // Chưa hết hạn
          }
        },
        include: {
          don_hang: {
            include: {
              khach_hang: true
            }
          }
        },
        orderBy: {
          thoi_gian_tao: 'desc'
        }
      });

      if (!pendingTransaction) {
        console.log('📊 No pending transactions to simulate');
        return;
      }

      // 30% chance to simulate payment success
      const shouldSimulate = Math.random() < 0.3;
      if (!shouldSimulate) {
        console.log('🎲 Random skip simulation');
        return;
      }

      console.log('🎭 Simulating payment for transaction:', pendingTransaction.ma_giao_dich);

      // Cập nhật trạng thái giao dịch
      await prisma.giao_dich_ngan_hang.update({
        where: { id: pendingTransaction.id },
        data: {
          trang_thai: 'da_xac_nhan',
          nguoi_xac_nhan: 'MOCK_SIMULATOR',
          thoi_gian_xac_nhan: new Date()
        }
      });

      // Cập nhật trạng thái đơn hàng
      if (pendingTransaction.don_hang) {
        await prisma.don_hang.update({
          where: { id: pendingTransaction.don_hang.id },
          data: {
            trang_thai_thanh_toan: true,
            trang_thai: 'da_xac_nhan'
          }
        });
      }

      // Emit Socket.IO event
      if (global.io) {
        global.io.to(`transaction-${pendingTransaction.ma_giao_dich}`).emit('payment-success', {
          transactionId: pendingTransaction.ma_giao_dich,
          orderId: pendingTransaction.ma_don_hang,
          message: 'Thanh toán đã được xác nhận tự động!',
          source: 'MOCK_SIMULATOR'
        });
        console.log('📡 Socket.IO event emitted for transaction:', pendingTransaction.ma_giao_dich);
      }

      console.log('✅ Payment simulated successfully for:', pendingTransaction.ma_giao_dich);

    } catch (error) {
      console.error('❌ Error simulating payment:', error);
    }
  }

  // Manual trigger simulation
  async triggerSimulation() {
    console.log('🎯 Manual simulation triggered');
    await this.simulatePayment();
  }

  // Get simulator status
  getStatus() {
    return {
      isRunning: this.isRunning,
      simulationInterval: this.simulationInterval ? 'active' : 'inactive'
    };
  }
}

module.exports = new MockPaymentSimulatorService();