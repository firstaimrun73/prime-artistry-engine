import { finish } from "./helpers";
import { h1, p, note, btn, img } from "./chrome";
import { wrap } from "./wrap";
import { featsTable, pricingTable } from "./tables";

export function welcomeEmail(vars: Record<string, string | number> = {}) {
  const body =
    h1("Welcome, {{name}}! 🎉") +
    p("Your email is confirmed and your account is ready. Motio2edit, powered by <b>Motion2AI</b>, is where you make images, videos and music with AI, and edit photos <b>without writing a single prompt</b>.") +
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
