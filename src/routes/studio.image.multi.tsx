import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Layers } from "lucide-react";
import { Header } from "@/components/Header";
import { MultiImageFeature } from "@/components/multi-image/MultiImageFeature";

export const Route = createFileRoute("/studio/image/multi")({
  head: () => ({
    meta: [
      { title: "Multi-Image — Motio2edit" },
      {
        name: "description",
        content:
          "Combine multiple reference images in one edit with Motio2edit Multi-Image (paid plans).",
      },
    ],
  }),
  component: MultiImagePage,
});

function MultiImagePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-12">
        <div className="mb-6">
          <Link
            to="/studio/image"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Image Studio
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <Layers className="h-6 w-6 text-primary" />
            Multi-Image
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Primary + reference images in one job. Free plan locked — paid plan limits apply.
          </p>
        </div>
        <MultiImageFeature />
      </main>
    </div>
  );
}
