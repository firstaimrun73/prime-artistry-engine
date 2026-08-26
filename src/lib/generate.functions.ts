import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CREDIT_COST, type PlanId } from "@/lib/plans";
import { maxVideoDurationForPlan, videoCreditCost } from "@/lib/video-options";
import { getVideoModel, applyVideoStyle, estimateModelCredits } from "@/lib/video-model-registry";
import { buildVideoFromRegistry } from "@/lib/video-fal-step";
import {
  imageUpscaleFactor,
  videoResolutionMultiplier,
  videoResolutionUpscales,
} from "@/lib/quality-options";
import { computeImageExperienceCredits } from "@/lib/studio/image/image-experience-credits";
import {
  executeStandardImage,
  quoteStandardCredits,
  validateStandardImageRequest,
} from "@/lib/studio/image/standard";
import {
  isPremiumMultiGptCandidate,
  planPremiumMultiGptImage2,
} from "@/lib/studio/image/premium/multi-image";
import {
  isUltraCandidate,
  executeUltraImage,
  validateUltraImageRequest,
  quoteUltraCredits,
} from "@/lib/studio/image/ultra";
