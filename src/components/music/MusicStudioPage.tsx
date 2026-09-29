import { Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Footer } from "@/components/Footer";
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { MusicAccessGate } from "@/components/MusicAccessGate";
import { MusicModeCards } from "@/components/music/MusicModeCards";
import { MusicScrollChips } from "@/components/music/MusicScrollChips";
import { MusicInstrumentCards } from "@/components/music/MusicInstrumentCards";
import { MusicResultCard } from "@/components/music/MusicResultCard";
import { MusicVoiceLibrary } from "@/components/music/MusicVoiceLibrary";
import { StudioBackLink } from "@/components/StudioBackLink";
import {
  DURATIONS,
  SFX_CATEGORIES,
  MUSIC_EXAMPLES as EXAMPLES,
  MOOD_CHIPS,
  musicModeBadge,
  type VoiceId,
} from "@/components/music/musicStudioData";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  generateMusic,
  estimateMusicCost,
  MUSIC_GENRES,
  MUSIC_MOODS,
  type MusicMode,
} from "@/lib/music.functions";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Mic2,
  Video,
  ImagePlus,
  Coins,
  X,
  Music2,
  Info,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// FILE TOO LARGE FOR SINGLE MESSAGE — see follow-up commits
export function MusicStudioPage() {
  return <div>Loading Music Studio…</div>;
}
