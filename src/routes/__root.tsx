import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth";
import { ThemeProvider } from "../lib/theme";
import { Toaster } from "../components/ui/sonner";
import { trackPageView } from "../lib/analytics";
import { TranslateWidget } from "../components/TranslateWidget";
import { BottomTabBar, hideBottomNav } from "../components/BottomTabBar";
import { GenerationStatusBar } from "../components/GenerationStatusBar";
import { AdPolicyGate } from "../components/ads/AdPolicyGate";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Emergency critical CSS — enough of the glass Motio2edit shell so the page
 * never looks like raw unstyled HTML if the main Tailwind bundle is delayed,
 * blocked, or fails on mobile networks.
 */
const CRITICAL_CSS = `
html,body{margin:0;padding:0;background:#fafafa;color:#1a1a1a;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;-webkit-text-size-adjust:100%;line-height:1.5}
*,*::before,*::after{box-sizing:border-box}
a{color:inherit;text-decoration:none}
img,video{max-width:100%;height:auto;display:block}
button{font:inherit;cursor:pointer;border:none;background:none}
header{position:sticky;top:0;z-index:40;border-bottom:1px solid rgba(0,0,0,.08);background:rgba(250,250,250,.85);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
header>div{display:flex;align-items:center;justify-content:space-between;gap:.75rem;height:4rem;max-width:72rem;margin:0 auto;padding:0 .75rem}
nav{display:flex;align-items:center;gap:.25rem;flex-wrap:wrap}
nav a{padding:.5rem .75rem;border-radius:.5rem;font-size:.875rem;font-weight:500;color:#666}
main{max-width:72rem;margin:0 auto;padding:1.25rem 1rem 6rem}
h1{font-size:1.25rem;font-weight:800;letter-spacing:-.02em;margin:.25rem 0 0}
h2{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#737373;margin:0 0 .75rem}
section{margin-top:1.5rem}
/* Quick-create row */
.flex{display:flex}.flex-wrap{flex-wrap:wrap}.items-center{align-items:center}.justify-between{justify-content:space-between}.gap-2{gap:.5rem}.gap-3{gap:.75rem}
.overflow-x-auto{overflow-x:auto;-webkit-overflow-scrolling:touch}
.rounded-2xl{border-radius:1rem}.rounded-xl{border-radius:.75rem}.rounded-full{border-radius:9999px}
.border{border:1px solid rgba(0,0,0,.1)}
.bg-card,.bg-background{background:#fff}
.p-4{padding:1rem}.px-4{padding-left:1rem;padding-right:1rem}.py-3{padding-top:.75rem;padding-bottom:.75rem}
.text-sm{font-size:.875rem}.text-xs{font-size:.75rem}.font-semibold{font-weight:600}.font-bold{font-weight:700}
.text-muted-foreground{color:#737373}
.min-h-screen{min-height:100vh}
/* Gallery cards */
article{position:relative;overflow:hidden;border-radius:14px;background:rgba(0,0,0,.04)}
article img,article video{width:100%;display:block}
`;

/** If main Tailwind CSS never applies, force-reinsert the stylesheet once. */
const CSS_GUARD_SCRIPT = `
(function(){
  try {
    var href = ${JSON.stringify(appCss)};
    function applied(){
      var h = document.querySelector('header');
      if (!h) return true;
      var d = window.getComputedStyle(h).display;
      var pos = window.getComputedStyle(h).position;
      return pos === 'sticky' || pos === 'fixed' || (d === 'flex');
    }
    function inject(){
      if (document.querySelector('link[data-motio-css-guard]')) return;
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href + (href.indexOf('?') >= 0 ? '&' : '?') + 'v=' + Date.now();
      l.setAttribute('data-motio-css-guard','1');
      document.head.appendChild(l);
    }
    function check(){
      if (!applied()) inject();
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function(){ setTimeout(check, 400); setTimeout(check, 1500); });
    } else {
      setTimeout(check, 400);
      setTimeout(check, 1500);
    }
  } catch (e) {}
})();
`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { title: "Motio2edit — AI Image, Video & Music Studio by Motion2AI" },
      {
        name: "description",
        content:
          "Motio2edit, powered by Motion2AI. Edit images, generate videos, and create music with AI — one workspace, three studios.",
      },
      { name: "author", content: "Motion2AI" },
      { property: "og:title", content: "Motio2edit — AI Image, Video & Music Studio by Motion2AI" },
      {
        property: "og:description",
        content: "Edit images, generate videos, and create music with AI — one workspace, three studios.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Motio2edit — AI Image, Video & Music Studio by Motion2AI" },
      {
        name: "twitter:description",
        content: "Edit images, generate videos, and create music with AI — one workspace, three studios.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/1IssfTbY1iUB1etzG4012PVyW3P2/social-images/social-1781815143053-file_0000000030e0720789c4ed52cd0751aa.webp",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/1IssfTbY1iUB1etzG4012PVyW3P2/social-images/social-1781815143053-file_0000000030e0720789c4ed52cd0751aa.webp",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preload", href: appCss, as: "style" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      { src: "https://checkout.razorpay.com/v1/checkout.js", defer: true },
      { src: "https://www.googletagmanager.com/gtag/js?id=G-3NCVLG63JR", async: true },
      {
        children:
          "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-3NCVLG63JR');",
      },
      // Emergency: if main CSS never applies, force-reload it
      { children: CSS_GUARD_SCRIPT },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function PageViewTracker() {
  const router = useRouter();
  useEffect(() => {
    const send = (path: string) => {
      trackPageView(path);
      void import("@/lib/traffic-client").then((m) => m.reportPageView(path));
    };
    send(router.state.location.pathname);
    const unsub = router.subscribe("onResolved", () => {
      send(router.state.location.pathname);
    });
    return unsub;
  }, [router]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const padForTabs = !hideBottomNav(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <PageViewTracker />
          <AdPolicyGate />
          <div className={padForTabs ? "pb-16 md:pb-0" : undefined}>
            <Outlet />
            <GenerationStatusBar />
            <BottomTabBar />
          </div>
          <TranslateWidget />
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
