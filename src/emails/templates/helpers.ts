/**
 * Email fill helpers + plan vars from @/lib/plans (read-only).
 */
import { FREE_SIGNUP_CREDITS, PLANS, type PlanId } from "@/lib/plans";

export const EMAIL_IMAGE_BASE = "https://assets.motio2edit.com/email/" as const;
export type EmailResult = { subject: string; html: string };

export function fillTemplate(raw: string, vars: Record<string, string | number>): string {
  return raw.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) =>
    vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : `{{${k}}}`,
  );
}

export function assertNoPlaceholders(html: string, subject: string): void {
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  const all = new Set<string>();
  for (const m of html.matchAll(re)) all.add(m[1]);
  for (const m of subject.matchAll(re)) all.add(m[1]);
  if (all.size) throw new Error(`[email] unresolved placeholders: ${[...all].join(", ")}`);
}

export function buildPlanEmailVars(): Record<string, string> {
  const byId = (id: PlanId) => PLANS.find((p) => p.id === id);
  const fmtPrice = (id: PlanId) => {
    const p = byId(id);
    if (!p) return "";
    const usd = p.price.USD;
    if (usd === 0) return "Free";
    return `$${usd % 1 === 0 ? String(usd) : usd.toFixed(2)}`;
  };
  const fmtCredits = (id: PlanId) => {
    const p = byId(id);
    return p ? p.credits.toLocaleString("en-US") : "";
  };
  return {
    price_free: fmtPrice("free"),
    price_lite: fmtPrice("lite"),
    price_plus: fmtPrice("plus"),
    price_pro: fmtPrice("pro"),
    price_studio: fmtPrice("studio"),
    credits_free: fmtCredits("free"),
    credits_lite: fmtCredits("lite"),
    credits_plus: fmtCredits("plus"),
    credits_pro: fmtCredits("pro"),
    credits_studio: fmtCredits("studio"),
    free_credits: String(FREE_SIGNUP_CREDITS),
    plans_url: "https://motio2edit.com/pricing",
  };
}

export function finish(
  subject: string,
  html: string,
  vars: Record<string, string | number> = {},
): EmailResult {
  const merged = { ...buildPlanEmailVars(), ...vars };
  const out = {
    subject: fillTemplate(subject, merged),
    html: fillTemplate(html, merged),
  };
  assertNoPlaceholders(out.html, out.subject);
  return out;
}

export const TRANSACTIONAL_TEMPLATES = [
  "verifyEmail", "loginCode", "resetPassword", "passwordChanged",
  "loginEmailChanged", "newSignIn", "welcome", "planPurchased",
] as const;

export const MARKETING_TEMPLATES = ["promptlessEdits", "plansNudge"] as const;
