// Serves /ads.txt for Google AdSense verification.
//
// A static file also exists at public/ads.txt, but SPA hosting can rewrite
// unknown paths to index.html. This server route guarantees a plain-text
// response with the correct content type on every deployment target.

import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const ADS_TXT = "google.com, pub-7901147042865442, DIRECT, f08c47fec0942fa0\n";

export const Route = createFileRoute("/ads.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(ADS_TXT, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        }),
    },
  },
});
