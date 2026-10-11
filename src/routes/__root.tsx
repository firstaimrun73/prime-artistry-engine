import {
  HeadContent,
  Scripts,
  createRootRoute,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ThemeProvider } from "../components/ThemeProvider";
import { AuthProvider } from "../lib/auth";
import appCss from "../styles.css?url";
import { useEffect } from "react";
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
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-muted-foreground">Page not found</p>
        <a href="/" className="mt-6 inline-block text-primary underline">
          Go home
        </a>
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

function PageViewTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
  return null;
}

function RootComponent() {
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
          {import.meta.env.DEV ? (
            <TanStackRouterDevtools position="bottom-right" />
          ) : null}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Motio2edit — AI Image & Video Studio" },
      {
        name: "description",
        content:
          "Create and edit images and videos with AI. Motio2edit studio for free and paid plans.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  ),
});
