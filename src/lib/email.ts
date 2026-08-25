import { formatDualPrice } from "./currency";

export interface EmailOrderDetails {
  id: string;
  publicMemo: string;
  totalAmount: number;
  paymentMethod: string;
  itemsJson: string;
}

export async function sendOrderEmailNotification(order: EmailOrderDetails) {
  const notifyEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL;
  if (!notifyEmail) {
    console.log("[Email Notification] No ADMIN_NOTIFY_EMAIL set in .env, skipping email dispatch.");
    return;
  }

  let itemsHtml = "";
  let itemsText = "";
  try {
    const items = JSON.parse(order.itemsJson);
    itemsHtml = items
      .map(
        (item: { name: string; quantity: number; price: number }) =>
          `<tr>
            <td style="padding: 8px; border: 1px solid #334155;">${item.name}</td>
            <td style="padding: 8px; border: 1px solid #334155; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px; border: 1px solid #334155; text-align: right;">${formatDualPrice(item.price * item.quantity)}</td>
          </tr>`
      )
      .join("");

    itemsText = items
      .map(
        (item: { name: string; quantity: number; price: number }) =>
          `- ${item.name} x${item.quantity} (${formatDualPrice(item.price * item.quantity)})`
      )
      .join("\n");
  } catch {
    itemsHtml = "<tr><td colspan='3' style='padding: 8px;'>Order items</td></tr>";
    itemsText = "- Order items";
  }

  const subject = `[xA1 Store] New Order Payment: ${order.publicMemo} - ${formatDualPrice(order.totalAmount)}`;

  const textBody = `
========================================
NEW ORDER PAYMENT RECEIVED
========================================
Order ID / Memo: ${order.publicMemo}
Internal ID: ${order.id}
Payment Method: ${order.paymentMethod.toUpperCase()}
Total Amount: ${formatDualPrice(order.totalAmount)}

ITEMS:
${itemsText}
========================================
To fulfill this order, reply to customer via Telegram bot or admin panel.
`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background-color: #0d0f18; color: #f8fafc; padding: 24px; border-radius: 8px;">
      <h2 style="color: #10b981; margin-top: 0;">🎮 New Order Payment Received</h2>
      <p style="font-size: 14px; color: #94a3b8;">A customer just submitted payment for an order.</p>
      
      <div style="background-color: #161a2e; padding: 16px; border: 1px solid #334155; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Order ID / Memo:</strong> <span style="color: #34d399; font-size: 16px; font-weight: bold;">${order.publicMemo}</span></p>
        <p style="margin: 4px 0;"><strong>Total Amount:</strong> <span style="color: #10b981; font-weight: bold;">${formatDualPrice(order.totalAmount)}</span></p>
        <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
      </div>

      <h3 style="color: #e2e8f0; font-size: 14px; margin-bottom: 8px;">Order Items</h3>
      <table style="width: 100%; border-collapse: collapse; background-color: #121524; color: #e2e8f0; font-size: 13px;">
        <thead>
          <tr style="background-color: #1e293b;">
            <th style="padding: 8px; border: 1px solid #334155; text-align: left;">Item</th>
            <th style="padding: 8px; border: 1px solid #334155; text-align: center;">Qty</th>
            <th style="padding: 8px; border: 1px solid #334155; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>
  `;

  // 1. If RESEND_API_KEY is configured, send via Resend REST API (zero npm dependency required)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "orders@resend.dev";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [notifyEmail],
          subject,
          html: htmlBody,
          text: textBody,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Resend API error:", errorData);
      } else {
        console.log(`[Email Notification] Order email sent to ${notifyEmail} via Resend.`);
        return;
      }
    } catch (err) {
      console.error("Failed to send email via Resend:", err);
    }
  }

  // 2. If SMTP / Webhook / Mailgun or other generic mailer is not set, log notification
  console.log(`[Email Notification Dispatch] To: ${notifyEmail}\nSubject: ${subject}\n${textBody}`);
}
