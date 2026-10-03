/** Email outer HTML shell. */
import { logo } from "./chrome";
const R = "#FF3B1F";

export function wrap(pre: string, body: string, marketing = false): string {
  const foot = marketing
    ? `You get this because you have a Motio2edit account. <a href="{{unsubscribe_url}}" style="color:#FF8A1F">Unsubscribe</a> · `
    : `This is a security / account email. You can't unsubscribe from these. `;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#efeae6"><div style="display:none;max-height:0;overflow:hidden">${pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efeae6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:20px;overflow:hidden">
<tr><td style="height:6px;background:${R};background-image:linear-gradient(90deg,#FF2D1A,#FF8A1F)"></td></tr>
<tr><td style="padding:28px 32px 8px">${logo()}</td></tr>
<tr><td style="padding:16px 32px 32px">${body}</td></tr>
<tr><td style="padding:20px 32px;background:#17171c;text-align:center;font:12px/1.6 Arial,sans-serif;color:#9a9aa6">${foot}<a href="mailto:support@motio2edit.com" style="color:#FF8A1F">support@motio2edit.com</a><br>© Motio2edit · powered by Motion2AI</td></tr>
</table></td></tr></table></body></html>`;
}
