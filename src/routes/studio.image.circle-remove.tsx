/**
 * Circle 2edit — /studio/image/circle-remove
 * Remove: circleInstant true
 * Add: circleInstant false → flux-pro fill; asset rail + factors + confirm
 * Exit/Back respects from=home|info|sample so Homepage → Editor → Exit returns Homepage.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { generateMedia } from "@/lib/generate.functions";
import { secureDownloadImage } from "@/lib/download.functions";
import { triggerBrowserDownload } from "@/lib/secure-image-download";
import { supabase } from "@/integrations/supabase/client";
import {
  readCircleKeepWatermarkPref,
  writeCircleKeepWatermarkPref,
} from "@/lib/circle-edit/circle-watermark";
import { SMART_REMOVE_PROMPT } from "@/components/SmartRemoveModal";
import {
  CircleEditShell,
  CircleEditUploadZone,
  CircleEditActionBar,
  CircleDrawToolbar,
  CircleEditGenOverlay,
  CircleCreditsInfo,
  type CircleDrawTool,
  type InkColor,
} from "@/components/circle-edit/CircleEditShell";
import {
  CircleMaskStage,
  type CircleMaskStageHandle,
} from "@/components/circle-edit/CircleMaskStage";
import { CircleAddAssetRail } from "@/components/circle-edit/CircleAddAssetRail";
import { CircleFactorPicker } from "@/components/circle-edit/CircleFactorPicker";
import { CompareSlider } from "@/components/CompareSlider";
import { findAddAsset } from "@/lib/circle-edit/add-assets";
import type { MaskTool } from "@/components/circle-edit/mask/types";
import { useTheme } from "@/lib/theme";
import { isFreePlan } from "@/lib/policy";
import { CIRCLE_REMOVE_CREDITS, estimateCircleAddCredits } from "@/lib/circle-edit/credits";
import { getAssetCreditCost } from "@/lib/circle-edit/add-assets-pricing";
import { AssetIcon } from "@/components/circle-edit/AssetIcon";
import { cn } from "@/lib/utils";
import { resolveCircleBackTarget } from "@/lib/circle-edit/circle-samples";

type CircleSearch = {
  mode?: "add" | "remove";
  assetId?: string;
  sampleId?: string;
  from?: "home" | "info" | "sample";
};

export const Route = createFileRoute("/studio/image/circle-remove")({
  ssr: false,
  validateSearch: (raw: Record<string, unknown>): CircleSearch => {
    const mode = raw.mode === "add" || raw.mode === "remove" ? raw.mode : undefined;
    const assetId =
      typeof raw.assetId === "string" && raw.assetId.length > 0 && raw.assetId.length <= 80
        ? raw.assetId
        : undefined;
    const sampleId =
      typeof raw.sampleId === "string" && raw.sampleId.length > 0 && raw.sampleId.length <= 80
        ? raw.sampleId
        : undefined;
    const from =
      raw.from === "home" || raw.from === "info" || raw.from === "sample" ? raw.from : undefined;
    return { mode, assetId, sampleId, from };
  },
  component: Circle2editPage,
  head: () => ({
    meta: [
      { title: "Circle 2edit — Motio2edit" },
      { name: "description", content: "Circle 2edit — circle to remove or add objects." },
    ],
  }),
});

const GEN_STAGES = [
  "Preparing selection",
  "Understanding image",
  "Understanding object",
  "Matching perspective",
  "Matching lighting",
  "Building object",
  "Applying AI",
  "Finalising",
] as const;

type Phase = "select" | "generating" | "result";
type Mode = "remove" | "add";

function drawToolToMaskTool(t: CircleDrawTool): MaskTool {
  if (t === "eraser") return "erase";
  if (t === "brush") return "brush";
  return "circle";
}

async function waitForImageLoadable(url: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Result image failed to load"));
    img.src = url;
  });
}

function Circle2editPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const { user, profile, refreshProfile } = useAuth();
  const isAdmin = isAdminEmail(profile?.email);
  const addLocked = !isAdmin && isFreePlan(profile?.plan);
  const watermarkLocked = !isAdmin && isFreePlan(profile?.plan);
  const generate = useServerFn(generateMedia);
  const secureDl = useServerFn(secureDownloadImage);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fileRef = useRef<HTMLInputElement>(null);
  const maskStageRef = useRef<CircleMaskStageHandle>(null);
  const generatingLockRef = useRef(false);
  const tryNowHydratedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("select");
  const [mode, setMode] = useState<Mode>("remove");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [hasMask, setHasMask] = useState(false);
  const [drawTool, setDrawTool] = useState<CircleDrawTool>("circle");
  const [brushSize, setBrushSize] = useState(24);
  const [inkColor, setInkColor] = useState<InkColor>("purple");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [addObjectId, setAddObjectId] = useState<string | null>(null);
  const [factorSelection, setFactorSelection] = useState<Record<string, string>>({});
  const [addConfirmed, setAddConfirmed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [showCompare, setShowCompare] = useState(true);
  const [sourceWidth, setSourceWidth] = useState(0);
  const [sourceHeight, setSourceHeight] = useState(0);
  const [keepCircleWatermark, setKeepCircleWatermark] = useState(true);
  const progressTimers = useRef<number[]>([]);

  const goBack = useCallback(() => {
    const target = resolveCircleBackTarget(search.from, search.sampleId);
    navigate({ to: target as "/" });
  }, [navigate, search.from, search.sampleId]);

  const clearProgressTimers = useCallback(() => {
    progressTimers.current.forEach((id) => window.clearTimeout(id));
    progressTimers.current = [];
  }, []);

  const onHistoryChange = useCallback((u: boolean, r: boolean) => {
    setCanUndo(u);
    setCanRedo(r);
  }, []);

  useEffect(() => {
    if (watermarkLocked) {
      setKeepCircleWatermark(true);
      return;
    }
    setKeepCircleWatermark(readCircleKeepWatermarkPref());
  }, [watermarkLocked]);

  // NOTE: truncated intentionally for size — RESTORE FAILED IF YOU SEE THIS
  return null;
}
