const { PrismaClient } = require("@prisma/client");
const qrPaymentService = require("../services/qrPayment.service");
const CustomError = require("../services/CustomError");
const crypto = require("crypto");

// Single Prisma instance
const prisma = new PrismaClient();

// ============ CUSTOMER QR CREATION ============
// Create Bank QR for order (by numeric order id)
exports.createBankQRPayment = async (req, res) => {
  try {
    const { id } = req.params; // numeric order id
    const { customerId } = req;

    const order = await prisma.don_hang.findUnique({
      where: { id: Number(id) },
      include: { chi_tiet_don_hang: { include: { san_pham: true } } },
    });
    if (!order) throw new CustomError("Không tìm thấy đơn hàng", 404);
    if (customerId && order.id_khach_hang !== customerId)
      throw new CustomError("Không có quyền với đơn hàng này", 403);
    if (order.trang_thai !== "cho_xac_nhan")
      throw new CustomError("Đơn hàng không hợp lệ để thanh toán", 400);
    if (order.trang_thai_thanh_toan)
      throw new CustomError("Đơn hàng đã thanh toán", 400);

    const qrPayment = await qrPaymentService.createBankQRPayment(
      order.ma_don_hang,
      order.tong_tien,
      `Thanh toan don hang ${order.ma_don_hang}`
    );

    return res.json({ success: true, data: qrPayment, message: "QR code thanh toán ngân hàng đã được tạo" });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error("Create bank QR payment error:", error);
    return res.status(500).json({ error: "Lỗi tạo QR thanh toán ngân hàng" });
  }
};

// Create MoMo QR
exports.createMoMoQRPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId } = req;

    const order = await prisma.don_hang.findUnique({
      where: { id: Number(id) },
      include: { chi_tiet_don_hang: { include: { san_pham: true } } },
    });
    if (!order) throw new CustomError("Không tìm thấy đơn hàng", 404);
    if (customerId && order.id_khach_hang !== customerId)
      throw new CustomError("Không có quyền với đơn hàng này", 403);
    if (order.trang_thai !== "cho_xac_nhan")
      throw new CustomError("Đơn hàng không hợp lệ để thanh toán", 400);
    if (order.trang_thai_thanh_toan)
      throw new CustomError("Đơn hàng đã thanh toán", 400);

    const qrPayment = await qrPaymentService.createMoMoQRPayment(
      order.ma_don_hang,
      order.tong_tien,
      `Thanh toan don hang ${order.ma_don_hang}`
    );

    return res.json({ success: true, data: qrPayment, message: "QR code thanh toán MoMo đã được tạo" });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error("Create MoMo QR payment error:", error);
    return res.status(500).json({ error: "Lỗi tạo QR thanh toán MoMo" });
  }
};

// Check payment status
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const status = await qrPaymentService.checkPaymentStatus(transactionId);
    return res.json({ success: true, data: status });
  } catch (error) {
    console.error("Check payment status error:", error);
    return res.status(500).json({ error: "Lỗi kiểm tra trạng thái thanh toán" });
  }
};

// Cancel pending transaction
exports.cancelTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const cancelled = qrPaymentService.cancelTransaction(transactionId);
    if (!cancelled) return res.status(404).json({ success: false, message: "Không tìm thấy giao dịch" });
    return res.json({ success: true, message: "Giao dịch đã được hủy" });
  } catch (error) {
    console.error("Cancel transaction error:", error);
    return res.status(500).json({ error: "Lỗi hủy giao dịch" });
  }
};

// ============ BANK WEBHOOK ============
exports.handleBankWebhook = async (req, res) => {
  try {
    const body = req.body;
    console.log("🔔 Bank webhook received:", JSON.stringify(body, null, 2));

    if (!verifyWebhookSignature(body, req.headers))
      return res.status(401).json({ success: false, message: "Invalid signature" });

    const paymentData = normalizeWebhookPayload(body);
    if (!paymentData) return res.status(400).json({ success: false, message: "Invalid payload" });

    const { amount, description, transactionRef, bankCode, accountNumber } = paymentData;

    const expectedAccount = process.env.VIETQR_ACCOUNT_NUMBER || "";
    if (expectedAccount && accountNumber && accountNumber !== expectedAccount)
      return res.json({ success: true, ignored: true });

    const matchedTx = await findMatchingPendingTransactionByDesc(amount, description);
    if (!matchedTx) {
      await logUnmatchedWebhook({ amount, description, transactionRef, bankCode, accountNumber, webhookBody: body });
      return res.json({ success: true, matched: false });
    }

    await prisma.giao_dich_ngan_hang.update({
      where: { id: matchedTx.id },
      data: { ref_gateway: String(transactionRef || ""), ghi_chu: `BANK:${bankCode}` },
    });

    await qrPaymentService.verifyBankTransaction(matchedTx.ma_giao_dich, "BANK_WEBHOOK_AUTO");
    return res.json({ success: true, matched: true, transactionId: matchedTx.ma_giao_dich });
  } catch (error) {
    console.error("❌ Bank webhook error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// ============ MoMo WEBHOOK ============
exports.updateMoMoPaymentStatus = async (req, res) => {
  try {
    const params = req.body;
    const { verifyMoMoSignature } = require("../utils/momo");
    const valid = verifyMoMoSignature(params);
    if (!valid) return res.status(400).json({ message: "invalid signature" });

    const { orderId, resultCode } = params;
    await qrPaymentService.updatePaymentStatus(orderId, "paid");

    const order = await prisma.don_hang.findFirst({ where: { ma_don_hang: orderId } });
    if (order && Number(resultCode) === 0 && order.trang_thai === "cho_xac_nhan") {
      await prisma.don_hang.update({
        where: { id: order.id },
        data: { trang_thai_thanh_toan: true, trang_thai: "da_xac_nhan" },
      });
    }

    return res.json({ message: "ok" });
  } catch (error) {
    console.error("Update MoMo payment status error:", error);
    return res.status(500).json({ message: "internal error" });
  }
};

// ============ HELPERS ============
function verifyWebhookSignature(body, headers) {
  const secret = process.env.BANK_WEBHOOK_SECRET;
  if (!secret) return true; // dev mode: skip
  const signature = headers["x-signature"] || headers["X-Signature"] || headers["signature"];
  if (!signature) return false;
  if (process.env.SEPAY_TOKEN) {
    const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");
    return signature === expected;
  }
  if (process.env.CASSO_API_KEY) return signature === secret;
  return signature === secret;
}

function normalizeWebhookPayload(body) {
  if (body.type && body.data) {
    const d = body.data;
    return {
      amount: Number(d.amount || d.transferAmount),
      description: String(d.description || d.content || d.transferNote || ""),
      transactionRef: String(d.tid || d.transactionId || d.id || ""),
      bankCode: String(d.accountBankCode || d.bankCode || "MB").toUpperCase(),
      accountNumber: String(d.accountNumber || d.account || ""),
    };
  }
  if (body.error === 0 && body.data && Array.isArray(body.data.records)) {
    const r = body.data.records[0];
    if (r) {
      return {
        amount: Number(r.amount),
        description: String(r.description || ""),
        transactionRef: String(r.tid || r.id || ""),
        bankCode: "MB",
        accountNumber: String(r.account || ""),
      };
    }
  }
  if (body.amount && body.description) {
    return {
      amount: Number(body.amount),
      description: String(body.description),
      transactionRef: String(body.transactionRef || body.id || ""),
      bankCode: String(body.bankCode || "MB").toUpperCase(),
      accountNumber: String(body.accountNumber || process.env.VIETQR_ACCOUNT_NUMBER || ""),
    };
  }
  return null;
}

async function findMatchingPendingTransactionByDesc(amount, description) {
  try {
    const pending = await prisma.giao_dich_ngan_hang.findMany({
      where: { trang_thai: "cho_xac_nhan", thoi_gian_het_han: { gt: new Date() } },
      orderBy: { thoi_gian_tao: "desc" },
    });
    for (const tx of pending) {
      const amountMatch = Math.abs(Number(tx.so_tien) - Number(amount)) < 1000;
      const codeMatch = description.includes(tx.ma_xac_minh);
      const orderMatch = description.includes(tx.ma_don_hang);
      if (amountMatch && (codeMatch || orderMatch)) return tx;
    }
    return null;
  } catch (e) {
    console.error("Error matching tx:", e);
    return null;
  }
}

async function logUnmatchedWebhook(data) {
  console.log("📝 Unmatched webhook:", {
    ts: new Date().toISOString(),
    amount: data.amount,
    desc: data.description,
    ref: data.transactionRef,
    bankCode: data.bankCode,
    accountNumber: data.accountNumber,
  });
}
