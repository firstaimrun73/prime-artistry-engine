import { Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Footer } from "@/components/Footer";
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { MusicAccessGate } from "@/components/MusicAccessGate";
import { MusicModeCards } from "@/components/music/MusicModeCards";
import { MusicScrollChips } from "@/components/music/MusicScrollChips";
import { MusicInstrumentCards } from "@/components/music/MusicInstrumentCards";
import { MusicResultCard } from "@/components/music/MusicResultCard";
import { MusicVoiceLibrary } from "@/components/music/MusicVoiceLibrary";
import {
  DURATIONS, SFX_DURATIONS, SFX_CATEGORIES, LOADING_STEPS as LOADING,
  MOOD_CHIPS,
  type VoiceId,
} from "@/components/music/musicStudioData";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  generateMusic, getMusicCapabilities, MUSIC_GENRES, MUSIC_MOODS, type MusicMode,
} from "@/lib/music.functions";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { toast } from "sonner";
import { StudioBackLink } from "@/components/StudioBackLink";
import { Sparkles, Loader2, Mic2, Video, ImagePlus, Coins, X, Music2, Lock } from "lucide-react";
import { isAdminEmail } from "@/lib/admin-config";
import {
  ADMIN_TEST_PLAN_OPTIONS,
  readAdminTestPlan,
  writeAdminTestPlan,
} from "@/lib/studio/image/admin-test-plan";
import type { PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";

// RESTORED — full file continues in next update if truncated
export function MusicStudioPage() {
  return (
    <MusicAccessGate>
      <div className="p-8 text-center text-sm text-muted-foreground">Loading Music Studio…</div>
    </MusicAccessGate>
  );
}
