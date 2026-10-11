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

// Side-effect import ensures CSS is always in the client JS graph (not only a <link>).
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
import { MonetagInPagePush } from "../components/ads/MonetagInPagePush";
import { MonetagVignette } from "../components/ads/MonetagVignette";

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
 * SAFE critical CSS only — must NOT override Tailwind responsive utilities
 * (e.g. never force nav{display:flex} which breaks hidden lg:flex on mobile).
 */
const CRITICAL_CSS = `
html,body{margin:0;padding:0;-webkit-text-size-adjust:100%}
*,*::before,*::after{box-sizing:border-box}
img,video{max-width:100%;height:auto}
/* Google Translate: do not shove layout */
body{top:0!important}
.goog-te-banner-frame,.goog-te-balloon-frame,#goog-gt-tt{display:none!important;height:0!important;visibility:hidden!important}
`;

/**
 * Boot guard:
 * 1) Clear googtrans cookies that rewrite the DOM
 * 2) If main CSS clearly failed, re-inject stylesheet once
 */
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
    function ensureCss(){
      if (cssLoaded()) return;
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href + (href.indexOf('?') >= 0 ? '&' : '?') + 'boot=' + Date.now();
      document.head.appendChild(link);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function(){ setTimeout(ensureCss, 50); });
    } else {
      setTimeout(ensureCss, 50);
    }
  } catch (e) {}
})();
`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Motio2edit — AI Image, Video & Music Studio" },
      {
        name: "description",
        content:
          "Create and edit images, videos, and music with AI. Motio2edit studio for free and paid plans.",
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
      { children: BOOT_GUARD_SCRIPT },
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
          <AdPolicyGate />
          <MonetagInPagePush />
          <MonetagVignette />
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
