/** Email HTML chrome (logo, buttons, basic blocks). */
import { EMAIL_IMAGE_BASE } from "./helpers";
const O = "#FF5A1F";
const R = "#FF3B1F";

export function logo(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${R};background-image:linear-gradient(135deg,#FF2D1A,#FF8A1F);width:44px;height:44px;border-radius:12px;text-align:center;color:#fff;font-size:24px;line-height:44px">✦</td><td style="padding-left:10px;font:800 24px Arial,sans-serif;color:#17171c">Motio<span style="color:${O}">2</span>edit</td></tr></table>`;
}
export function btn(t: string, u: string): string {
  return `<a href="${u}" style="display:inline-block;background:${O};background-image:linear-gradient(90deg,${R},#FF8A1F);color:#fff;text-decoration:none;font:700 16px Arial,sans-serif;padding:14px 32px;border-radius:12px">${t}</a>`;
}
export function h1(t: string): string {
  return `<h1 style="margin:0 0 12px;font:800 26px Arial,sans-serif;color:#17171c">${t}</h1>`;
}
export function p(t: string): string {
  return `<p style="margin:0 0 16px;font:15px/1.6 Arial,sans-serif;color:#4a4a55">${t}</p>`;
}
export function otpBox(c: string): string {
  return `<div style="margin:20px 0;padding:18px;text-align:center;background:#FFF3EC;border:2px dashed ${O};border-radius:14px;font:800 36px 'Courier New',monospace;letter-spacing:10px;color:${R}">${c}</div>`;
}
export function note(t: string): string {
  return `<p style="margin:16px 0 0;padding:12px 14px;background:#f6f3f1;border-radius:10px;font:13px/1.5 Arial,sans-serif;color:#6b6b76">${t}</p>`;
}
export function img(f: string, a: string, w = 520): string {
  return `<img src="${EMAIL_IMAGE_BASE}${f}" alt="${a}" width="${w}" style="display:block;width:100%;max-width:${w}px;border-radius:14px;background:#1a1a2e">`;
}
