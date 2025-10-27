class MockPaymentSimulatorService {
  constructor() {
    this.isRunning = false;
    this.simulationInterval = null;
    // Default: do not auto start in webhook-only flow
    // this.startSimulation();
  }
  startSimulation() { /* ... unchanged ... */ }
  stopSimulation() { /* ... unchanged ... */ }
  async simulatePayment() { /* ... unchanged ... */ }
  async triggerSimulation() { /* ... unchanged ... */ }
  getStatus() { return { isRunning: this.isRunning, simulationInterval: this.simulationInterval ? 'active' : 'inactive' }; }
}

module.exports = new MockPaymentSimulatorService();
