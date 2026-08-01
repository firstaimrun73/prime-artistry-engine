// Serves /ads.txt for Google AdSense verification.
//
// A static file also exists at public/ads.txt, but SPA hosting can rewrite
// unknown paths to index.html. This server route guarantees a plain-text
// response with the correct content type on every deployment target.

import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/ads.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          "google.com, pub-7901147042865442, DIRECT, f08c47fec0942fa0\n",
          {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "public, max-age=86400",
            },
          },
        ),
    },
  },
});
