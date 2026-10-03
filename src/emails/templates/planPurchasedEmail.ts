import { finish } from "./helpers";
import { h1, p, note, btn } from "./chrome";
import { wrap } from "./wrap";

export function planPurchasedEmail(vars: Record<string, string | number> = {}) {
  const body =
    h1("Congratulations! 🎉") +
    p("Hi {{name}}, your <b>{{plan_name}}</b> plan is now active. Thank you for supporting Motio2edit.") +
    `<table role="presentation" width="100%" style="background:#FFF3EC;border-radius:14px;font:14px Arial;color:#4a4a55"><tr><td style="padding:16px">Plan: <b>{{plan_name}}</b><br>Amount: {{amount}}<br>Credits added: <b>{{credits_added}}</b><br>Valid until: {{expiry}}<br>Order ID: {{order_id}}</td></tr></table>` +
    `<p style="margin:20px 0">${btn("Open Studio", "https://motio2edit.com")}</p>` +
    note("Your creations are yours to use under your plan's license. Receipt and invoice are in Profile → Billing.");
  return finish("You're on {{plan_name}} 🎉", wrap("Payment received. Your plan is active.", body), vars);
}
