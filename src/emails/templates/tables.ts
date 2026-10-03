/**
 * Email pricing + features tables.
 */
const O = "#FF5A1F";
const R = "#FF3B1F";

export function pricingTable(): string {
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

export function featsTable(): string {
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
