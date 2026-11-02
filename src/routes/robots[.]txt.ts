import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * App-level robots.txt (served when not overridden by CDN/Cloudflare managed robots).
 * Primary host: https://www.motio2edit.com
 */
const BODY = `# Motio2edit robots.txt
# Canonical host: https://www.motio2edit.com

User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard
Disallow: /dashboard/
Disallow: /editor
Disallow: /editor/
Disallow: /checkout
Disallow: /checkout/
Disallow: /profile
Disallow: /profile/
Disallow: /settings
Disallow: /settings/
Disallow: /history
Disallow: /history/
Disallow: /admin
Disallow: /admin/
Disallow: /chat
Disallow: /chat/
Disallow: /tickets
Disallow: /tickets/
Disallow: /payment-success
Disallow: /payment-failed
Disallow: /reset-password
Disallow: /lovable/

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

Sitemap: https://www.motio2edit.com/sitemap.xml
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(BODY, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
