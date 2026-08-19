/**
 * Global generation status — floating bar + studio overlays.
 * Intermediate stages may advance while the request is in flight.
 * COMPLETE is only set by the caller after a real success response.
 * ERROR is set on real failure. Never invent COMPLETE from a timer alone.
 */
import { useEffect, useState } from "react";

export type GenerationKind = "image" | "video" | "music";

export type StudioJobStage =
  | "QUEUED"
  | "ANALYSING"
  | "PREPARING"
  | "PROCESSING"
  | "GENERATING"
  | "VALIDATING"
  | "STORING"
  | "COMPLETE"
  | "ERROR";

export type GenerationStatus = {
  kind: GenerationKind;
  editorPath: string;
  startedAt: number;
  stage: StudioJobStage;
  errorMessage?: string | null;
} | null;

let current: GenerationStatus = null;
const listeners = new Set<(s: GenerationStatus) => void>();

function emit() {
  for (const l of listeners) l(current);
}

export function startGeneration(kind: GenerationKind, editorPath: string) {
  current = {
    kind,
    editorPath,
    startedAt: Date.now(),
    stage: "QUEUED",
    errorMessage: null,
  };
  emit();
}

/** Advance intermediate stage while the backend request is still running. */
export function setGenerationStage(stage: StudioJobStage, errorMessage?: string | null) {
  if (!current) return;
  current = {
    ...current,
    stage,
    errorMessage: stage === "ERROR" ? errorMessage ?? current.errorMessage : null,
  };
  emit();
}

export function completeGeneration() {
  if (!current) return;
  current = { ...current, stage: "COMPLETE", errorMessage: null };
  emit();
}

export function failGeneration(message?: string) {
  if (!current) {
    current = {
      kind: "image",
      editorPath: "/",
      startedAt: Date.now(),
      stage: "ERROR",
      errorMessage: message ?? "Generation failed",
    };
  } else {
    current = { ...current, stage: "ERROR", errorMessage: message ?? "Generation failed" };
  }
  emit();
}

export function endGeneration() {
  current = null;
  emit();
}

export function useGenerationStatus(): GenerationStatus {
  const [state, setState] = useState<GenerationStatus>(current);
  useEffect(() => {
    const l = (s: GenerationStatus) => setState(s);
    listeners.add(l);
    setState(current);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

/**
 * While `active`, step through intermediate stages on a schedule.
 * Does NOT emit COMPLETE — only the real success path may call completeGeneration().
 */
export function useInFlightStageAdvance(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const steps: StudioJobStage[] = [
      "ANALYSING",
      "PREPARING",
      "PROCESSING",
      "GENERATING",
      "VALIDATING",
      "STORING",
    ];
    const delays = [600, 2200, 5500, 10000, 22000, 32000];
    const timers = steps.map((stage, i) =>
      setTimeout(() => {
        if (current && current.stage !== "ERROR" && current.stage !== "COMPLETE") {
          setGenerationStage(stage);
        }
      }, delays[i]),
    );
    return () => timers.forEach(clearTimeout);
  }, [active]);
}
