/**
 * Motio2edit branded emails — approved design (motio2edit-emails.html).
 * Image base: https://motio2edit.com/email/
 */
export const EMAIL_IMAGE_BASE = "https://motio2edit.com/email/" as const;
export type EmailResult = { subject: string; html: string };

export function fillTemplate(raw: string, vars: Record<string, string | number>): string {
  return raw.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) =>
    vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : `{{${k}}}`,
  );
}

export const DEFAULT_PLAN_EMAIL_VARS: Record<string, string> = {
  price_free: "Free",
  price_lite: "$9",
  price_plus: "$15",
  price_pro: "$29",
  price_studio: "$55",
  credits_free: "40",
  credits_lite: "500",
  credits_plus: "1,200",
  credits_pro: "3,000",
  credits_studio: "8,000",
  free_credits: "40",
  plans_url: "https://motio2edit.com/pricing",
};

const O = "#FF5A1F";
const R = "#FF3B1F";

function logo(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${R};background-image:linear-gradient(135deg,#FF2D1A,#FF8A1F);width:44px;height:44px;border-radius:12px;text-align:center;color:#fff;font-size:24px;line-height:44px">✦</td><td style="padding-left:10px;font:800 24px Arial,sans-serif;color:#17171c">Motio<span style="color:${O}">2</span>edit</td></tr></table>`;
}

function btn(t: string, u: string): string {
  return `<a href="${u}" style="display:inline-block;background:${O};background-image:linear-gradient(90deg,${R},#FF8A1F);color:#fff;text-decoration:none;font:700 16px Arial,sans-serif;padding:14px 32px;border-radius:12px">${t}</a>`;
}

function h1(t: string): string {
  return `<h1 style="margin:0 0 12px;font:800 26px Arial,sans-serif;color:#17171c">${t}</h1>`;
}

function p(t: string): string {
  return `<p style="margin:0 0 16px;font:15px/1.6 Arial,sans-serif;color:#4a4a55">${t}</p>`;
}

function otpBox(c: string): string {
  return `<div style="margin:20px 0;padding:18px;text-align:center;background:#FFF3EC;border:2px dashed ${O};border-radius:14px;font:800 36px 'Courier New',monospace;letter-spacing:10px;color:${R}">${c}</div>`;
}

function note(t: string): string {
  return `<p style="margin:16px 0 0;padding:12px 14px;background:#f6f3f1;border-radius:10px;font:13px/1.5 Arial,sans-serif;color:#6b6b76">${t}</p>`;
}

function img(f: string, a: string, w = 520): string {
  return `<img src="${EMAIL_IMAGE_BASE}${f}" alt="${a}" width="${w}" style="display:block;width:100%;max-width:${w}px;border-radius:14px;background:#1a1a2e" >`;
}

function wrap(pre: string, body: string, marketing = false): string {
  const foot = marketing
    ? `You get this because you have a Motio2edit account. <a href="{{unsubscribe_url}}" style="color:#FF8A1F">Unsubscribe</a> · `
    : `This is a security / account email. You can't unsubscribe from these. `;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head><body style="margin:0;background:#efeae6"><div style="display:none;max-height:0;overflow:hidden">${pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efeae6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:20px;overflow:hidden">
<tr><td style="height:6px;background:${R};background-image:linear-gradient(90deg,#FF2D1A,#FF8A1F)"></td></tr>
<tr><td style="padding:28px 32px 8px">${logo()}</td></tr>
<tr><td style="padding:16px 32px 32px">${body}</td></tr>
<tr><td style="padding:20px 32px;background:#17171c;text-align:center;font:12px/1.6 Arial,sans-serif;color:#9a9aa6">${foot}<a href="mailto:support@motio2edit.com" style="color:#FF8A1F">support@motio2edit.com</a><br>© Motio2edit · powered by Motion2AI</td></tr>
</table></td></tr></table></body></html>`;
}

function pricingTable(): string {
  const rows: [string, string, string, string][] = [
    ["Free", "Try it out", "free", ""],
    ["Lite", "Light creators", "lite", ""],
    ["Plus", "Regular use", "plus", ""],
    ["Pro", "Power users", "pro", "MOST POPULAR"],
    ["Studio", "Full studio, max credits", "studio", "BEST VALUE"],
  ];
  const parts = rows.map(([n, t, k, tag]) => {
    const tagHtml = tag
      ? ` <span style="background:${O};color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px">${tag}</span>`
      : "";
    const border = tag ? O : "#eee7e2";
    const bg = tag ? "#FFF3EC" : "#fff";
    return `<tr><td style="padding:6px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${border};border-radius:14px;background:${bg}"><tr><td style="padding:14px 16px;font:13px Arial;color:#6b6b76"><b style="font-size:17px;color:#17171c">${n}</b>${tagHtml}<br>${t}<br><span style="color:${R};font-weight:700">💎 {{credits_${k}}}</span></td><td align="right" style="padding:14px 16px;font:800 20px Arial;color:#17171c;white-space:nowrap">{{price_${k}}}<br><a href="{{plans_url}}" style="font:700 12px Arial;color:${O};text-decoration:none">Try now →</a></td></tr></table></td></tr>`;
  });
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px">${parts.join("")}</table>`;
}

function featsTable(): string {
  const items = [
    ["🖼️", "Image Studio", "Turn a few words into sharp, high-quality images in seconds."],
    ["🎬", "Video Studio", "Text to video, animate a photo, or enhance a clip, with sound."],
    ["🎵", "Music Studio", "Songs, instrumentals, background scores and sound effects."],
    ["🎙️", "AI Voice", "Turn any script into natural speech with five voices."],
    ["⭕", "Circle 2edit", "Circle an area, remove or add objects. No prompt needed."],
    ["✂️", "Cropmix and Remove", "Smart crop and one-tap object removal."],
  ];
  const rows = items.map(
    ([e, t, d]) =>
      `<tr><td width="44" valign="top" style="padding:8px 0;font-size:24px">${e}</td><td style="padding:8px 0;font:13px/1.5 Arial;color:#6b6b76"><b style="font-size:15px;color:#17171c">${t}</b><br>${d}</td></tr>`,
  );
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table>`;
}

function finish(subject: string, html: string, vars: Record<string, string | number>): EmailResult {
  const merged = { ...DEFAULT_PLAN_EMAIL_VARS, ...vars };
  return { subject: fillTemplate(subject, merged), html: fillTemplate(html, merged) };
}

export function verifyEmail(vars: Record<string, string | number> = {}): EmailResult {
  const body =
    h1("Verify your email") +
    p("Hi {{name}}, welcome to Motio2edit. Enter this code to confirm your email address.") +
    otpBox("{{otp}}") +
    p("This code expires in 10 minutes.") +
    note("Didn't sign up? Ignore this email. No account will be activated.");
  return finish("Verify your email · {{otp}}", wrap("Your Motio2edit verification code", body), vars);
}

export function loginCodeEmail(vars: Record<string, string | number> = {}): EmailResult {
  const body =
    h1("Your login code") +
    p("Use this one-time code to finish signing in as <b>{{email}}</b>.") +
    otpBox("{{otp}}") +
    p("It expires in 10 minutes. Never share it with anyone, Motio2edit staff will never ask for it.") +
    note("Not you? Change your password right away.");
  return finish("Your Motio2edit login code", wrap("Your login code", body), vars);
}

export function resetPasswordEmail(vars: Record<string, string | number> = {}): EmailResult {
  const body =
    h1("Reset your password") +
    p("We got a request to reset the password for {{email}}. Enter this code, then choose a new password.") +
    otpBox("{{otp}}") +
    `<p style="text-align:center;margin:0 0 16px">${btn("Set new password", "{{reset_url}}")}</p>` +
    note("Code valid for 10 minutes. If you didn't ask for this, your account is still safe, just ignore it.");
  return finish("Reset your Motio2edit password", wrap("Password reset code", body), vars);
}

export function passwordChangedEmail(vars: Record<string, string | number> = {}): EmailResult {
  const body =
    h1("Password changed ✓") +
    p("Hi {{name}}, your Motio2edit password was changed on <b>{{time}}</b> from {{device}}.") +
    `<p style="margin:0 0 16px">${btn("Go to login", "https://motio2edit.com/login")}</p>` +
    note("Wasn't you? Reset your password now and contact support@motio2edit.com.");
  return finish("Your password was changed", wrap("Your password was changed", body), vars);
}

export function loginEmailChangedEmail(vars: Record<string, string | number> = {}): EmailResult {
  const body =
    h1("Login details updated") +
    p("The email on your Motio2edit account changed from <b>{{old_email}}</b> to <b>{{new_email}}</b>.") +
    p("Use the new email next time you sign in.") +
    `<p style="margin:0 0 16px">${btn("Sign in", "https://motio2edit.com/login")}</p>` +
    note("If you didn't make this change, contact support@motio2edit.com immediately.");
  return finish("Your login details were updated", wrap("Login details updated", body), vars);
}

export function newSignInEmail(vars: Record<string, string | number> = {}): EmailResult {
  const body =
    h1("New sign-in") +
    p("Your account was signed in from a new device.") +
    `<table role="presentation" width="100%" style="background:#f6f3f1;border-radius:12px;font:14px Arial;color:#4a4a55"><tr><td style="padding:14px">Device: {{device}}<br>Location: {{location}}<br>Time: {{time}}</td></tr></table>` +
    note("Was this you? Nothing to do. If not, change your password.");
  return finish("New sign-in to your account", wrap("New sign-in detected", body), vars);
}

export function welcomeEmail(vars: Record<string, string | number> = {}): EmailResult {
  const body =
    h1("Welcome, {{name}}! 🎉") +
    p(
      "Your email is confirmed and your account is ready. Motio2edit, powered by <b>Motion2AI</b>, is where you make images, videos and music with AI, and edit photos <b>without writing a single prompt</b>.",
    ) +
    img("hero-mountain.jpg", "Sunset mountain lake") +
    `<div style="height:18px"></div>` +
    `<table role="presentation" width="100%" style="background:#17171c;border-radius:14px"><tr><td style="padding:16px 18px;font:13px Arial;color:#9a9aa6">YOUR CREDITS<br><b style="font:800 30px Arial;color:#fff">💎 {{free_credits}}</b><br>Every image, video and song uses credits. Top up any time or upgrade for more.</td></tr></table>` +
    `<h2 style="margin:24px 0 4px;font:800 18px Arial;color:#17171c">What you can do</h2>` +
    featsTable() +
    `<p style="margin:22px 0;text-align:center">${btn("Try now", "https://motio2edit.com")}</p>` +
    `<h2 style="margin:8px 0 4px;font:800 18px Arial;color:#17171c">Plans and credits</h2>` +
    p("Start free. Upgrade when you want premium quality and more credits.") +
    pricingTable() +
    note("Paid plans include a licence for commercial use of what you create. Need help? support@motio2edit.com");
  return finish("Welcome to Motio2edit, {{name}} 🎉", wrap("Your account is ready. Here is your free start.", body), vars);
}

export function promptlessEditsEmail(vars: Record<string, string | number> = {}): EmailResult {
  const body =
    h1("Edit photos without a prompt ⭕") +
    p(
      "<b>Motion2AI</b> now brings <b>Circle 2edit</b>, the world's first AI that works on <b>promptless edits</b>. No typing, no guessing.",
    ) +
    img("hero-circle2edit.jpg", "Circle 2edit demo") +
    `<div style="height:14px"></div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
    `<tr><td width="44" valign="top" style="padding:8px 0;font-size:24px">1️⃣</td><td style="padding:8px 0;font:13px/1.5 Arial;color:#6b6b76"><b style="font-size:15px;color:#17171c">Mark a region</b><br>Draw a circle around anything in your photo.</td></tr>` +
    `<tr><td width="44" valign="top" style="padding:8px 0;font-size:24px">2️⃣</td><td style="padding:8px 0;font:13px/1.5 Arial;color:#6b6b76"><b style="font-size:15px;color:#17171c">Remove or add</b><br>Delete an object, or add one that fits the scene.</td></tr>` +
    `<tr><td width="44" valign="top" style="padding:8px 0;font-size:24px">3️⃣</td><td style="padding:8px 0;font:13px/1.5 Arial;color:#6b6b76"><b style="font-size:15px;color:#17171c">Lighting matched</b><br>The AI matches light and shadow so edits look real.</td></tr>` +
    `</table>` +
    `<p style="margin:22px 0;text-align:center">${btn("Try Circle 2edit now", "https://motio2edit.com")}</p>` +
    note("Free to try with your starting credits. Open Home, then Quick Create, then Circle 2edit.");
  return finish(
    "The world's first promptless AI editing is here",
    wrap("Circle it. Edit it. No prompt.", body, true),
    vars,
  );
}

export function planPurchasedEmail(vars: Record<string, string | number> = {}): EmailResult {
  const body =
    h1("Congratulations! 🎉") +
    p("Hi {{name}}, your <b>{{plan_name}}</b> plan is now active. Thank you for supporting Motio2edit.") +
    `<table role="presentation" width="100%" style="background:#FFF3EC;border-radius:14px;font:14px Arial;color:#4a4a55"><tr><td style="padding:16px">Plan: <b>{{plan_name}}</b><br>Amount: {{amount}}<br>Credits added: <b>{{credits_added}}</b><br>Valid until: {{expiry}}<br>Order ID: {{order_id}}</td></tr></table>` +
    `<p style="margin:20px 0">${btn("Open Studio", "https://motio2edit.com")}</p>` +
    note("Your creations are yours to use under your plan's license. Receipt and invoice are in Profile → Billing.");
  return finish("You're on {{plan_name}} 🎉", wrap("Payment received. Your plan is active.", body), vars);
}

export function plansNudgeEmail(vars: Record<string, string | number> = {}): EmailResult {
  const body =
    h1("Create more, {{name}} ✨") +
    p(
      "You have <b>{{credits_left}} credits</b> left. Upgrade for premium quality, more credits and a <b>commercial-use licence</b> for everything you make.",
    ) +
    img("sample-jewelry.jpg", "Jewelry product shot") +
    `<h2 style="margin:22px 0 4px;font:800 18px Arial;color:#17171c">Choose your plan</h2>` +
    pricingTable() +
    `<p style="margin:22px 0;text-align:center">${btn("Try now", "https://motio2edit.com")}</p>` +
    `<h2 style="margin:8px 0 8px;font:800 18px Arial;color:#17171c">Made with Motio2edit</h2>` +
    `<table role="presentation" width="100%"><tr><td width="50%" style="padding:0 4px 0 0">${img("sample-bike.jpg", "Neon city bike", 250)}</td><td width="50%" style="padding:0 0 0 4px">${img("sample-portrait.jpg", "Pencil portrait", 250)}</td></tr><tr><td colspan="2" style="height:8px"></td></tr><tr><td width="50%" style="padding:0 4px 0 0">${img("sample-tea.jpg", "Tea hills", 250)}</td><td width="50%" style="padding:0 0 0 4px">${img("sample-music.jpg", "Orchestra", 250)}</td></tr></table>` +
    `<h2 style="margin:22px 0 4px;font:800 18px Arial;color:#17171c">Also inside</h2>` +
    featsTable() +
    note(
      "Sample images are Motio2edit creations. Paid plans include licence for commercial use of your own creations.",
    );
  return finish(
    "Unlock more credits with a Motio2edit plan",
    wrap("Pick a plan. Try it now.", body, true),
    vars,
  );
}

export const TRANSACTIONAL_TEMPLATES = [
  "verifyEmail",
  "loginCode",
  "resetPassword",
  "passwordChanged",
  "loginEmailChanged",
  "newSignIn",
  "welcome",
  "planPurchased",
] as const;

export const MARKETING_TEMPLATES = ["promptlessEdits", "plansNudge"] as const;
