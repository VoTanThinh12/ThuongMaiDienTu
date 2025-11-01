const { PrismaClient } = require("@prisma/client");
const qrPaymentService = require("../services/qrPayment.service");
const CustomError = require("../services/CustomError");
const crypto = require("crypto");

const prisma = new PrismaClient();

// ... giữ nguyên các handler phía trên

// 🚀 NEW: Bank Webhook Handler - Nhận thông báo từ gateway khi có chuyển khoản
exports.handleBankWebhook = async (req, res) => {
  try {
    const body = req.body;
    console.log("🔔 Bank webhook received:", JSON.stringify(body, null, 2));

    // 1) Verify webhook signature (optional in dev)
    if (!verifyWebhookSignature(body, req.headers)) {
      console.warn("❌ Invalid webhook signature");
      return res.status(401).json({ success: false, message: "Invalid signature" });
    }

    // 2) Chuẩn hoá payload (Sepay/Casso/Generic)
    const paymentData = normalizeWebhookPayload(body);
    if (!paymentData) {
      console.warn("❌ Invalid webhook payload format");
      return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    const { amount, description, transactionRef, bankCode, accountNumber } = paymentData;

    // 3) Chỉ xử lý giao dịch vào đúng tài khoản cấu hình
    const expectedAccount = process.env.VIETQR_ACCOUNT_NUMBER;
    const expectedBank = (process.env.VIETQR_BANK_CODE || "MB").toUpperCase();
    if (expectedAccount && accountNumber && accountNumber !== expectedAccount) {
      console.log(`ℹ️ Skip other account: ${bankCode}-${accountNumber}`);
      return res.json({ success: true, ignored: true });
    }

    // 4) Tìm giao dịch pending khớp theo verification code hoặc mã đơn + số tiền
    const matchedTx = await findMatchingPendingTransactionByDesc(amount, description);
    if (!matchedTx) {
      console.warn("⚠️ No matching pending transaction found");
      await logUnmatchedWebhook({ amount, description, transactionRef, bankCode, accountNumber, webhookBody: body });
      return res.json({ success: true, matched: false });
    }

    // 5) Xác nhận thanh toán thành công; lưu reference của gateway để trace
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

// ===== Helpers =====
function verifyWebhookSignature(body, headers) {
  const secret = process.env.BANK_WEBHOOK_SECRET;
  if (!secret) return true;
  const signature = headers["x-signature"] || headers["X-Signature"] || headers["signature"];
  if (!signature) return false;
  if (process.env.SEPAY_TOKEN) {
    const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");
    return signature === expected;
  }
  if (process.env.CASSO_API_KEY) return signature === secret;
  return signature === secret;
}

// Normalize payload từ nhiều nguồn (ưu tiên Sepay)
function normalizeWebhookPayload(body) {
  // Sepay.vn
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
  // Casso.vn
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
  // Generic
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

// Tìm transaction pending theo amount + (ma_xac_minh hoặc ma_don_hang) xuất hiện trong description
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
  console.log("📝 Unmatched webhook:", { ts: new Date().toISOString(), amount: data.amount, desc: data.description, ref: data.transactionRef });
}
