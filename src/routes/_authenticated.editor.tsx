import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { EditorDisclaimer } from "@/components/EditorDisclaimer";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getPlan, CREDIT_COST } from "@/lib/plans";
import { generateMedia } from "@/lib/generate.functions";
import { getSmartSuggestions, EXAMPLE_PROMPTS, ASPECT_RATIOS, type AspectRatio } from "@/lib/prompt-suggestions";
import {
  IMAGE_QUALITY_OPTIONS,
  VIDEO_RESOLUTION_OPTIONS,
  imageQualityCost,
  videoResolutionMultiplier,
  type ImageQuality,
  type VideoResolution,
} from "@/lib/quality-options";
import { watermarkImage, applyDownloadWatermarkGrid } from "@/lib/watermark";
import { SmartRemoveModal, SMART_REMOVE_PROMPT } from "@/components/SmartRemoveModal";
import { ImageEditorToolPanel } from "@/components/editor/ImageEditorToolPanel";
import { isAdminEmail } from "@/lib/admin-config";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { CompareSlider } from "@/components/CompareSlider";
import { MultiImageInput } from "@/components/MultiImageInput";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { getPlanLimits } from "@/utils/planLimits";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { CreditWarningBanner, LOW_CREDIT_TOAST_KEY } from "@/components/CreditWarningBanner";
import {
  VIDEO_DURATIONS,
  VIDEO_ASPECT_RATIOS,
  videoCreditCost,
  isDurationAllowed,
  planRequiredForDuration,
  modelTierForDuration,
  MODEL_TIER_LABEL,
  MODEL_TIER_DESCRIPTION,
  type VideoDuration,
  type VideoAspectRatio,
} from "@/lib/video-options";

import { toast } from "sonner";
import {
  Upload, Sparkles, Download, Lock, Image as ImageIcon, Video,
  Square, RotateCcw, Pencil, Recycle, Check, RefreshCw, Share2, Wand2, Eraser,
  Plus, X, Coins,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/editor")({
  component: Editor,
});

type GenState = "idle" | "analyzing" | "loading" | "success" | "blocked";

/** One uploaded image slot in the multi-image strip. */
type GalleryItem = {
  id: string;
  preview: string;
  dataUrl: string | null;
  file: File | null;
};

const MAX_GALLERY_IMAGES = 10;
const WATERMARK_PREF_KEY = "motio2edit-watermark-pref";

const LOADING_MESSAGES = [
  "Creating your masterpiece…",
  "Enhancing with AI…",
  "Generating cinematic results…",
  "Applying advanced AI edits…",
  "Perfecting every pixel…",
  "Bringing your idea to life…",
];

type QuickStyle = { emoji: string; label: string; prompt: string };

const VIDEO_QUICK_STYLES: QuickStyle[] = [
  { emoji: "🎬", label: "Slow Motion", prompt: "Animate as smooth cinematic slow motion, ~0.5x speed, buttery frame interpolation, subtle motion blur and stable camera. Keep the subject's identity and scene unchanged." },
  { emoji: "💫", label: "Cinematic FX", prompt: "Add cinematic camera motion with a slow dolly-in, shallow depth of field, atmospheric particles and filmic color grading while preserving the original subject and composition." },
  { emoji: "🎵", label: "Music Video Vibe", prompt: "Turn into a stylish music-video shot with rhythmic camera moves, bold color grading, punchy lighting and dynamic energy; keep the subject centered." },
  { emoji: "🌊", label: "Smooth Motion", prompt: "Generate very smooth, natural motion with a gentle parallax pan and subtle environmental movement (hair, fabric, background). No warping or identity drift." },
  { emoji: "⚡", label: "Action Scene", prompt: "Turn into a high-energy action sequence with a fast tracking camera, dynamic angles, motion blur and dramatic lighting while keeping the subject sharp and recognizable." },
  { emoji: "🎭", label: "Scene Continue", prompt: "Naturally continue the scene as if the camera keeps rolling: consistent lighting, consistent subject identity, coherent environment motion and no cuts." },
];
