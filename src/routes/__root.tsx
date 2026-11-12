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

import "../styles.css";
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
import {
  SITE_NAME,
  SITE_URL,
  SITE_BRAND_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  organizationJsonLd,
  websiteJsonLd,
  softwareApplicationJsonLd,
} from "../lib/seo";

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

const CRITICAL_CSS = `
html,body{margin:0;padding:0;-webkit-text-size-adjust:100%}
*,*::before,*::after{box-sizing:border-box}
img,video{max-width:100%;height:auto}
body{top:0!important}
.goog-te-banner-frame,.goog-te-balloon-frame,#goog-gt-tt{display:none!important;height:0!important;visibility:hidden!important}
`;

const BOOT_GUARD_SCRIPT = `
(function(){
  try {
    var host = location.hostname;
    var domains = ['', host];
    var parts = host.split('.');
    if (parts.length >= 2) domains.push('.' + parts.slice(-2).join('.'));
    domains.forEach(function(d){
      var dom = d ? '; domain=' + d : '';
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + dom;
    });
    try { localStorage.removeItem('motio2edit-gt-lang'); } catch(e) {}

    /* EMERGENCY: strip known ad scripts on boot */
    try {
      document.querySelectorAll('script[src*="n6wxm.com"],script[src*="nap5k.com"],script[src*="monetag"],#motio-monetag-vignette,#motio-monetag-ipp').forEach(function(el){ el.remove(); });
    } catch (e) {}

    var href = ${JSON.stringify(appCss)};
    function cssLoaded(){
      try {
        var probe = document.createElement('div');
        probe.className = 'bg-background';
        probe.style.cssText = 'position:absolute;left:-9999px;top:0';
        document.body.appendChild(probe);
        var bg = window.getComputedStyle(probe).backgroundColor;
        document.body.removeChild(probe);
        return bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
      } catch (e) { return true; }
    }
    function injectCss(){
      if (document.querySelector('link[data-motio-css-guard]')) return;
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href + (href.indexOf('?') >= 0 ? '&' : '?') + 'v=' + Date.now();
      l.setAttribute('data-motio-css-guard','1');
      document.head.appendChild(l);
    }
    function check(){ if (!cssLoaded()) injectCss(); }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function(){
        setTimeout(check, 400);
        setTimeout(check, 1500);
      });
    } else {
      setTimeout(check, 400);
      setTimeout(check, 1500);
    }
  } catch (e) {}
})();
`;

const STRUCTURED_DATA_SCRIPT = JSON.stringify([
  organizationJsonLd(),
  websiteJsonLd(),
  softwareApplicationJsonLd(),
]);

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { title: `${SITE_NAME} — AI Photo & Video Editor` },
      { name: "description", content: SITE_BRAND_DESCRIPTION },
      { name: "author", content: SITE_NAME },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: `${SITE_NAME} — AI Photo & Video Editor` },
      { property: "og:description", content: SITE_BRAND_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:image", content: DEFAULT_OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${SITE_NAME} — AI Photo & Video Editor` },
      { name: "twitter:description", content: SITE_BRAND_DESCRIPTION },
      { name: "twitter:image", content: DEFAULT_OG_IMAGE },
    ],
    links: [
      { rel: "canonical", href: SITE_URL },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "preload", href: appCss, as: "style" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [
      { src: "https://checkout.razorpay.com/v1/checkout.js", defer: true },
      { src: "https://www.googletagmanager.com/gtag/js?id=G-3NCVLG63JR", async: true },
      {
        children:
          "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-3NCVLG63JR');",
      },
      { children: BOOT_GUARD_SCRIPT },
      {
        type: "application/ld+json",
        children: STRUCTURED_DATA_SCRIPT,
      },
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
      <body className="min-h-screen bg-background text-foreground antialiased">
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
          {/* Ads OFF — only cleanup gate remains */}
          <AdPolicyGate />
          <div className={padForTabs ? "pb-16 desktop-shell:pb-0" : undefined}>
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
