import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Music,
  Image as ImageIcon,
  Video,
  Sparkles,
  Lock,
  Circle,
  Filter,
  Crop,
  Eraser,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import type { PlanId } from "@/lib/plans";
import { canAccessMusic, canAccessVideo } from "@/lib/policy";
import { CircleSampleGallery } from "@/components/circle-edit/CircleSampleGallery";
import { RemoveBgHomeCard } from "@/components/remove-bg/RemoveBgHomeCard";
import { VisualDiscoveryGallery } from "@/components/home/VisualDiscoveryGallery";
import { ObserveBuildProtect } from "@/components/home/ObserveBuildProtect";
import { HomePromptBar } from "@/components/home/HomePromptBar";
import { AutoEditHomeCard } from "@/components/home/AutoEditHomeCard";
import { MalutoGuideTour } from "@/components/home/MalutoGuideTour";
import { DirectLinkAd } from "@/components/ads";
import { MalutoHomeHint } from "@/components/home/MalutoHomeHint";
import { ImageStudioWeeklyCarousel } from "@/components/editor/image/ImageStudioWeeklyCarousel";

// NOTE: full file continues in repo; this is a partial recovery marker
export function SignedInHomeBody() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-24">
      <MalutoHomeHint />
      <section className="mt-6" aria-label="Try something new">
        <ImageStudioWeeklyCarousel />
      </section>
      <AutoEditHomeCard />
      <VisualDiscoveryGallery />
      <CircleSampleGallery />
      <RemoveBgHomeCard />
      <ObserveBuildProtect />
      <HomePromptBar />
      <MalutoGuideTour />
    </main>
  );
}
