import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Public robots.txt — Motio2edit
 * Allows major search + AI search crawlers. Blocks private app surfaces.
 * Does not invent verification tokens.
 */
const BODY = `# Motio2edit robots.txt
# https://motio2edit.com

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

# Explicit allow for major search / AI crawlers (same rules as * above)
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://motio2edit.com/sitemap.xml
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
