/**
 * Verified Motio2edit product knowledge for Chatbot.
 * Only facts confirmed from app plans/policy/config — no invented claims.
 */
export const PRODUCT_KNOWLEDGE = `
Product: Motio2edit by Motion2AI — AI image, video, and music workspace.

Studios:
- Image Studio: generate and edit images (Standard, Premium, Ultra AI on higher plans). Tools include Circle 2edit, Cropmix, Remove BG, Auto Edit, Filters, multi-image references.
- Video Studio: generate videos (Standard / Premium on paid plans). Free plan does not include video generation.
- Music Studio: generate music (modes include Song, Instrumental, Voiceover, SFX, BGM, AI Voice depending on plan). Free has limited music access.

Plans (user-facing names; internal ids in parentheses):
- Free: 40 starter credits once at signup (not a priced plan). Image Standard, limited Music, no video. Watermark-free downloads for paid; free may have watermark policy per product rules.
- Lite: 350 credits/month — Image Standard, Video Standard, Music Standard (Song & Instrumental), Circle 2edit, Cropmix, Remove BG, multi-image up to 5.
- Plus: 800 credits/month — Image Standard, Video Standard, Music all 6 modes, longer tracks, Auto Edit, Filters, multi-image up to 10.
- Pro: 2,500 credits/month — Image Standard+Premium, Video Standard+Premium, Music Premium, priority queue, 120s music.
- AI Studio (id studio): 5,000 credits/month — Image Standard+Premium+Ultra AI, higher concurrency.
- Master Studio (id business): 10,000 credits/month — full Ultra AI, IMAX + 8K Max + custom aspect, highest concurrency. User-facing name is always "Master Studio" (never "Commercial").

Pricing (USD monthly, other currencies available at checkout): Lite $4.99, Plus $9.99, Pro $29.99, AI Studio $55, Master Studio $110. Do not invent other prices.

Credits:
- New accounts automatically receive 40 free signup credits once (idempotent). No monthly free-credit reset. No "Activate free plan" checkout.
- Paid plans grant monthly plan credits. Credit top-ups can be purchased separately.
- Generation costs credits; exact per-operation costs are enforced server-side and may vary by mode/quality — if unsure of a specific debit amount, say to check the studio UI quote before generating.

Access rules:
- Chatbot: Master Studio and admin only (server-enforced).
- Video: paid plans including Lite; free never.
- Music: all signed-in users with plan-based capability limits.
- History: users can toggle saving present generations in Settings.
- Watermark: free-tier policy may apply watermarks; paid plans are watermark-free for downloads unless user opts otherwise where supported.

Navigation:
- Main workspace has studios for Image, Video, Music.
- Pricing / Upgrade leads to plan selection and checkout (Razorpay / PayPal).
- Settings: profile, password (requires current password), notifications, history preference, theme, language.
- Billing/subscription and credit top-up are under profile/subscription routes.

Security:
- Authenticated password change requires re-entering the current password.
- Password recovery/reset is separate from authenticated change.
- Security emails (password changed, etc.) are transactional and not blocked by marketing unsubscribe.

Marketing emails:
- Only to confirmed users who have not unsubscribed; cadence and daily caps are enforced server-side. Transactional/security emails always send.

Chatbot limitations:
- Cannot generate or edit images, video, or music yet — those features are still in development for Chatbot.
- Users should use the dedicated studios for media work.
`.trim();
