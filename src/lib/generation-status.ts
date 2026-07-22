// Global generation status store — powers the floating bottom generation bar.
// Any editor can call startGeneration / endGeneration; the bar stays visible
// while the user navigates around the app.
import { useEffect, useState } from "react";

export type GenerationKind = "image" | "video" | "music";

export type GenerationStatus = {
  kind: GenerationKind;
  editorPath: string;
  startedAt: number;
} | null;

let current: GenerationStatus = null;
const listeners = new Set<(s: GenerationStatus) => void>();

function emit() {
  for (const l of listeners) l(current);
}

export function startGeneration(kind: GenerationKind, editorPath: string) {
  current = { kind, editorPath, startedAt: Date.now() };
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
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}
