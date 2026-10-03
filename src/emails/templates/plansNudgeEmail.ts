import { finish } from "./helpers";
import { h1, p, note, btn, img } from "./chrome";
import { wrap } from "./wrap";
import { featsTable, pricingTable } from "./tables";

export function plansNudgeEmail(vars: Record<string, string | number> = {}) {
  const body =
    h1("Create more, {{name}} ✨") +
    p("You have <b>{{credits_left}} credits</b> left. Upgrade for premium quality, more credits and a <b>commercial-use licence</b> for everything you make.") +
    img("sample-jewelry.jpg", "Jewelry product shot") +
    `<h2 style="margin:22px 0 4px;font:800 18px Arial;color:#17171c">Choose your plan</h2>` +
    pricingTable() +
    `<p style="margin:22px 0;text-align:center">${btn("Try now", "https://motio2edit.com")}</p>` +
    `<h2 style="margin:8px 0 8px;font:800 18px Arial;color:#17171c">Made with Motio2edit</h2>` +
    `<table role="presentation" width="100%"><tr><td width="50%" style="padding:0 4px 0 0">${img("sample-bike.jpg", "Neon city bike", 250)}</td><td width="50%" style="padding:0 0 0 4px">${img("sample-portrait.jpg", "Pencil portrait", 250)}</td></tr><tr><td colspan="2" style="height:8px"></td></tr><tr><td width="50%" style="padding:0 4px 0 0">${img("sample-tea.jpg", "Tea hills", 250)}</td><td width="50%" style="padding:0 0 0 4px">${img("sample-music.jpg", "Orchestra", 250)}</td></tr></table>` +
    `<h2 style="margin:22px 0 4px;font:800 18px Arial;color:#17171c">Also inside</h2>` +
    featsTable() +
    note("Sample images are Motio2edit creations. Paid plans include licence for commercial use of your own creations.");
  return finish(
    "Unlock more credits with a Motio2edit plan",
    wrap("Pick a plan. Try it now.", body, true),
    vars,
  );
}
