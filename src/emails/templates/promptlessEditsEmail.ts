import { finish } from "./helpers";
import { h1, p, note, btn, img } from "./chrome";
import { wrap } from "./wrap";

export function promptlessEditsEmail(vars: Record<string, string | number> = {}) {
  const body =
    h1("Edit photos without a prompt ⭕") +
    p("<b>Motion2AI</b> now brings <b>Circle 2edit</b>, the world's first AI that works on <b>promptless edits</b>. No typing, no guessing.") +
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
