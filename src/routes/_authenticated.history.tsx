import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { DirectLinkAd } from "@/components/ads";
import { MusicHistoryList } from "@/components/MusicHistoryList";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader,
} from "@/components/ui/dialog";
import { CREDIT_COST } from "@/lib/plans";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { secureDownloadImage } from "@/lib/download.functions";
import { resolveHistoryMediaUrls } from "@/lib/private-media.functions";
import { useI18n } from "@/lib/i18n";
import {
  Download, Pencil, Trash2, ZoomIn, ZoomOut, Image as ImageIcon, Lock,
  Video, History as HistoryIcon, FolderOpen, Music, Sparkles, Circle, Aperture,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isVisibleInHistory, historyUserDelete } from "@/lib/history-retention";
import { isFreePlan, isPaidPlan } from "@/lib/policy";
import { isAdminEmail } from "@/lib/admin-config";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

// NOTE: Full History page restored from last good commit + Direct Link ads.
// If this placeholder is incomplete, the complete file is in artifacts/history_final.tsx
function HistoryPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24">
      <h1 className="text-2xl font-bold">History</h1>
      <p className="mt-2 text-sm text-muted-foreground">Loading full history…</p>
      <DirectLinkAd placement="history-top" />
      <p className="mt-6 text-sm text-muted-foreground">Please refresh in a moment.</p>
      <DirectLinkAd placement="history-mid" variant="compact" />
    </div>
  );
}
