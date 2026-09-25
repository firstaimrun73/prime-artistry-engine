/**
 * Shared on-device face tracking for Lens AR overlays.
 *
 * Primary: MediaPipe Face Landmarker (WASM, @mediapipe/tasks-vision)
 *   - 478 real landmarks, facial transformation matrix
 *   - Inference on-device only (no network after model load)
 * Fallback: null when MediaPipe unavailable or no face found.
 *   NEVER invent synthetic center-face coordinates for face-dependent lenses.
 *
 * Singleton pattern: one FaceLandmarker instance shared across all lenses.
 * GPU delegate preferred; automatic CPU fallback on failure.
 * disposeFaceLandmarker() releases WASM resources when camera stops.
 */

import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

export type FaceLandmarks = {
  headTop: { x: number; y: number };
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  nose: { x: number; y: number };
  mouth: { x: number; y: number };
  chin: { x: number; y: number };
  roll: number;
  scale: number;
  confidence: number;
  /** Full 478-point MediaPipe landmarks when available */
  raw?: Array<{ x: number; y: number; z?: number }>;
};

type FaceLandmarkerInstance = FaceLandmarker;

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const WASM_ROOT =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";

let landmarker: FaceLandmarkerInstance | null = null;
let initPromise: Promise<FaceLandmarkerInstance | null> | null = null;
let initFailed = false;
let videoTimestamp = 0;

/** Convert MediaPipe normalized landmarks → FaceLandmarks */
function landmarksFromMediaPipe(
  landmarks: Array<{ x: number; y: number; z?: number }>,
  matrix?: { data?: Float32Array | number[] }
): FaceLandmarks {
  const L_EYE = 33;
  const R_EYE = 263;
  const NOSE = 1;
  const MOUTH = 13;
  const CHIN = 152;
  const FOREHEAD = 10;

  const lx = landmarks[L_EYE]?.x ?? 0.5;
  const ly = landmarks[L_EYE]?.y ?? 0.4;
  const rx = landmarks[R_EYE]?.x ?? 0.5;
  const ry = landmarks[R_EYE]?.y ?? 0.4;
  const nx = landmarks[NOSE]?.x ?? 0.5;
  const ny = landmarks[NOSE]?.y ?? 0.5;
  const mx = landmarks[MOUTH]?.x ?? 0.5;
  const my = landmarks[MOUTH]?.y ?? 0.65;
  const cx = landmarks[CHIN]?.x ?? 0.5;
  const cy = landmarks[CHIN]?.y ?? 0.85;
  const fx = landmarks[FOREHEAD]?.x ?? 0.5;
  const fy = landmarks[FOREHEAD]?.y ?? 0.2;

  const headTop = { x: fx, y: Math.max(0, fy - 0.08) };

  const dx = rx - lx;
  const dy = ry - ly;
  const roll = Math.atan2(dy, dx);

  const eyeDist = Math.hypot(dx, dy) || 0.1;
  const scale = eyeDist / 0.12;

  return {
    headTop,
    leftEye: { x: lx, y: ly },
    rightEye: { x: rx, y: ry },
    nose: { x: nx, y: ny },
    mouth: { x: mx, y: my },
    chin: { x: cx, y: cy },
    roll,
    scale,
    confidence: 0.9,
    raw: landmarks,
  };
}

/**
 * Ensure a singleton FaceLandmarker is ready.
 * Tries GPU first, falls back to CPU on failure.
 */
export function ensureFaceLandmarker(): Promise<FaceLandmarkerInstance | null> {
  if (landmarker) return Promise.resolve(landmarker);
  if (initFailed) return Promise.resolve(null);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      try {
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFacialTransformationMatrixes: true,
        });
      } catch (gpuErr) {
        console.warn("[face-track] GPU delegate failed; retrying CPU", gpuErr);
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFacialTransformationMatrixes: true,
        });
      }
      return landmarker;
    } catch (err) {
      console.error("[face-track] MediaPipe init failed", err);
      initFailed = true;
      landmarker = null;
      return null;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Run face detection on the current video frame.
 * Returns null when no face or landmarker unavailable.
 * NEVER invents a synthetic center face.
 */
export async function detectFace(
  video: HTMLVideoElement,
  _canvas?: HTMLCanvasElement | null
): Promise<FaceLandmarks | null> {
  if (!video || video.readyState < 2) return null;

  const fl = await ensureFaceLandmarker();
  if (!fl) return null;

  try {
    videoTimestamp += 33;
    const result = fl.detectForVideo(video, videoTimestamp);
    const landmarks = result.faceLandmarks?.[0];
    if (!landmarks || landmarks.length === 0) return null;

    const matrix = result.facialTransformationMatrixes?.[0];
    return landmarksFromMediaPipe(landmarks, matrix);
  } catch (err) {
    console.warn("[face-track] detectForVideo error", err);
    return null;
  }
}

/**
 * Synchronous face landmarks for canvas frames (carousel lenses).
 * Uses MediaPipe when the singleton is ready.
 * Returns null when no real face is found or MediaPipe is unavailable.
 * NEVER returns a synthetic center-face fallback.
 */
export function detectFaceLandmarksSync(src: HTMLCanvasElement): FaceLandmarks | null {
  if (!src || src.width < 2 || src.height < 2) return null;

  if (landmarker) {
    try {
      videoTimestamp += 33;
      const anyFl = landmarker as FaceLandmarkerInstance & {
        detectForVideo?: (input: HTMLCanvasElement | HTMLVideoElement, ts: number) => {
          faceLandmarks?: Array<Array<{ x: number; y: number; z?: number }>>;
          facialTransformationMatrixes?: Array<{ data?: Float32Array | number[] }>;
        };
        detect?: (input: HTMLCanvasElement) => {
          faceLandmarks?: Array<Array<{ x: number; y: number; z?: number }>>;
          facialTransformationMatrixes?: Array<{ data?: Float32Array | number[] }>;
        };
      };
      const result =
        typeof anyFl.detectForVideo === "function"
          ? anyFl.detectForVideo(src, videoTimestamp)
          : typeof anyFl.detect === "function"
            ? anyFl.detect(src)
            : null;
      const landmarks = result?.faceLandmarks?.[0];
      if (landmarks && landmarks.length > 0) {
        const matrix = result?.facialTransformationMatrixes?.[0];
        return landmarksFromMediaPipe(landmarks, matrix);
      }
    } catch (err) {
      console.warn("[face-track] detectFaceLandmarksSync error", err);
    }
  }

  // No real face — return null. Face-dependent lenses must not invent coordinates.
  return null;
}

/** Pre-warm the landmarker (call early, e.g. on camera start) */
export function warmFaceLandmarker(): void {
  void ensureFaceLandmarker();
}

/**
 * Release MediaPipe resources. Call when camera stops / component unmounts.
 */
export function disposeFaceLandmarker(): void {
  if (landmarker) {
    try {
      landmarker.close();
    } catch {
      /* ignore */
    }
    landmarker = null;
  }
  initPromise = null;
  initFailed = false;
  videoTimestamp = 0;
}
