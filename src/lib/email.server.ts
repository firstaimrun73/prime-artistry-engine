// Server-only email helper for payment alerts via the Resend HTTP API.
// SMTP/nodemailer cannot run on the Workers runtime, so we use Resend's REST API
// directly with your own Resend API key (RESEND_API_KEY).
const RESEND_URL = "https://api.resend.com/emails";

export async function sendPaymentErrorReport(args: {
  userId: string;
  transactionId: string;
  paymentMethod: string;
  error: string;
  amount: number | string;
  currency: string;
}): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const supportEmail = process.env.SUPPORT_EMAIL;
  if (!RESEND_API_KEY || !supportEmail) {
    console.error("[payments] payment error (email not configured):", args);
    return;
  }

  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
    <div style="background:#c0392b;color:#fff;padding:20px;border-radius:8px 8px 0 0">
      <h2 style="margin:0">Payment Error</h2>
    </div>
    <div style="background:#f9f9f9;padding:24px;border:1px solid #eee;border-radius:0 0 8px 8px">
      <p><b>User ID:</b> ${args.userId}</p>
      <p><b>Transaction ID:</b> ${args.transactionId}</p>
      <p><b>Method:</b> ${args.paymentMethod}</p>
      <p><b>Amount:</b> ${args.amount} ${args.currency}</p>
      <p><b>Error:</b> <span style="color:#c0392b">${args.error}</span></p>
      <p><b>Time:</b> ${new Date().toUTCString()}</p>
    </div>
  </div>`;
  try {
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: `Motio2Edit Alerts <${supportEmail}>`,
        to: [supportEmail],
        subject: `[PAYMENT ERROR] ${args.paymentMethod} — ${args.transactionId}`,
        html,
      }),
    });
    if (!res.ok) console.error("[payments] alert email failed:", res.status, await res.text());
  } catch (err) {
    console.error("[payments] alert email error:", err);
  }
}
