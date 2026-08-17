import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan } from "@/lib/policy";
import { ArrowRight, Image as ImageIcon, Layers } from "lucide-react";

export const Route = createFileRoute("/studio/image")({
  head: () => ({
    meta: [
      { title: "Image Studio — MOTIO2EDIT" },
      {
        name: "description",
        content: "Full image editing workspace — edit, enhance, restyle in one editor.",
      },
      { property: "og:title", content: "Image Studio — MOTIO2EDIT" },
    ],
  }),
  component: ImageStudio,
});

/**
 * Image Studio → Image Editor panel directly.
 * Never routes to Global Auto. Multi-Image remains a separate feature.
 */
function ImageStudio() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const admin = isAdminEmail(profile?.email);
  const paid = admin || isPaidPlan(profile?.plan);

  const openEditor = () => {
    try {
      sessionStorage.setItem("motio2edit-mode", "image");
      sessionStorage.removeItem("motio2edit-preset");
    } catch {
      /* ignore */
    }
    navigate({ to: user ? "/editor" : "/auth", search: user ? undefined : { redirect: "/editor" } });
  };

  // Signed-in users go straight into the Image Editor panel.
  useEffect(() => {
    if (!user) return;
    try {
      sessionStorage.setItem("motio2edit-mode", "image");
      sessionStorage.removeItem("motio2edit-preset");
    } catch {
      /* ignore */
    }
    navigate({ to: "/editor" });
  }, [user, navigate]);

  // While redirecting signed-in users, avoid flashing the gateway.
  if (user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted-foreground">
          Opening Image Studio…
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 pb-24 md:pb-12">
        <Link to="/studio" className="text-xs font-medium text-muted-foreground hover:text-foreground">
          {t("studio.allStudios")}
        </Link>

        <div className="relative mt-6 overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent" />
          <div className="relative">
            <div className="inline-flex rounded-2xl bg-primary p-3 text-primary-foreground shadow-lg">
              <ImageIcon className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight">
              Image <span className="text-primary">Studio</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Upload a photo, pick a tool, describe the change, generate. Crop, Circle to Remove,
              enhance, and style — all in the editor.
            </p>
            <Button size="lg" className="mt-8" onClick={openEditor}>
              {t("studio.openEditor")}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>

        {paid && (
          <Link
            to="/studio/image/multi"
            className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <Layers className="h-5 w-5 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Multi-Image</p>
              <p className="text-xs text-muted-foreground">Blend multiple references into one result</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}
      </main>
      <Footer />
    </div>
  );
}
