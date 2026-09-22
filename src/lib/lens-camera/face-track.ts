/**
 * Shared on-device face tracking for Lens AR overlays.
 *
 * Primary: MediaPipe Face Landmarker (WASM, @mediapipe/tasks-vision)
 *   - 478 real landmarks, facial transformation matrix
 *   - Inference runs entirely in the browser; camera frames never leave the device
 *   - Model WASM files are fetched once from the official CDN (not a tracking API)
 *
 * Fallback: YCbCr skin bounds + dark-spot eye refine (only if MediaPipe fails to load)
 *
 * No paid APIs, no API keys, no remote frame upload.
 */

export type FacePoint = { x: number; y: number };

export type FaceLandmarks = {
  bounds: { x: number; y: number; w: number; h: number };
  faceCentre: FacePoint;
  forehead: FacePoint;
  headTop: FacePoint;
  leftEye: FacePoint;
  rightEye: FacePoint;
  leftEyeOuter: FacePoint;
  rightEyeOuter: FacePoint;
  /** Face width in source pixels */
  scale: number;
  /** Roll radians (positive = clockwise) */
  roll: number;
  /** Pitch proxy roughly -1..1 */
  pitch: number;
  /** Yaw proxy roughly -1..1 */
  yaw: number;
  confidence: number;
  source: "mediapipe" | "skin" | "fallback";
};

// --- MediaPipe Face Mesh landmark indices (canonical face model) ---
const IDX = {
  forehead: 10,
  foreheadUpper: 9,
  noseTip: 1,
  chin: 152,
  leftOuter: 33,
  leftInner: 133,
  leftUpper: 159,
  leftLower: 145,
  rightOuter: 263,
  rightInner: 362,
  rightUpper: 386,
  rightLower: 374,
  leftCheek: 234,
  rightCheek: 454,
} as const;

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

type LandmarkList = Array<{ x: number; y: number; z?: number }>;

type FaceLandmarkerInstance = {
  detect: (image: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement) => {
    faceLandmarks: LandmarkList[];
    facialTransformationMatrixes?: Array<{ data: Float32Array | number[] }>;
  };
  detectForVideo: (
    image: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement,
    timestampMs: number,
  ) => {
    faceLandmarks: LandmarkList[];
    facialTransformationMatrixes?: Array<{ data: Float32Array | number[] }>;
  };
  close?: () => void;
};

let landmarker: FaceLandmarkerInstance | null = null;
let initPromise: Promise<FaceLandmarkerInstance | null> | null = null;
let initFailed = false;
let videoTimestamp = 0;

function avgPt(lms: LandmarkList, indices: number[], W: number, H: number): FacePoint {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const i of indices) {
    const p = lms[i];
    if (!p) continue;
    x += p.x * W;
    y += p.y * H;
    n++;
  }
  if (n === 0) return { x: W * 0.5, y: H * 0.5 };
  return { x: x / n, y: y / n };
}

function pt(lms: LandmarkList, i: number, W: number, H: number): FacePoint {
  const p = lms[i];
  if (!p) return { x: W * 0.5, y: H * 0.5 };
  return { x: p.x * W, y: p.y * H };
}

/** Extract roll/pitch/yaw from 4x4 column-major facial transformation matrix. */
function poseFromMatrix(data: Float32Array | number[] | undefined): {
  roll: number;
  pitch: number;
  yaw: number;
} {
  if (!data || data.length < 16) return { roll: 0, pitch: 0, yaw: 0 };
  const r00 = data[0];
  const r01 = data[4];
  const r02 = data[8];
  const r10 = data[1];
  const r11 = data[5];
  const r12 = data[9];
  const r20 = data[2];
  const r21 = data[6];
  const r22 = data[10];
  const pitch = Math.asin(Math.max(-1, Math.min(1, -r12)));
  const roll = Math.atan2(r02, r22);
  const yaw = Math.atan2(r10, r11);
  return { roll, pitch, yaw };
}

function landmarksFromMediaPipe(
  lms: LandmarkList,
  matrix: Float32Array | number[] | undefined,
  W: number,
  H: number,
): FaceLandmarks {
  const leftEye = avgPt(lms, [IDX.leftOuter, IDX.leftInner, IDX.leftUpper, IDX.leftLower], W, H);
  const rightEye = avgPt(
    lms,
    [IDX.rightOuter, IDX.rightInner, IDX.rightUpper, IDX.rightLower],
    W,
    H,
  );
  const leftOuter = pt(lms, IDX.leftOuter, W, H);
  const rightOuter = pt(lms, IDX.rightOuter, W, H);
  const forehead = pt(lms, IDX.forehead, W, H);
  const foreheadUpper = pt(lms, IDX.foreheadUpper, W, H);
  const chin = pt(lms, IDX.chin, W, H);
  const leftCheek = pt(lms, IDX.leftCheek, W, H);
  const rightCheek = pt(lms, IDX.rightCheek, W, H);
  const nose = pt(lms, IDX.noseTip, W, H);

  const xs = [leftCheek.x, rightCheek.x, leftOuter.x, rightOuter.x, forehead.x, chin.x];
  const ys = [foreheadUpper.y, forehead.y, chin.y, leftOuter.y, rightOuter.y];
  let minX = Math.min(...xs);
  let maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  const padX = (maxX - minX) * 0.08;
  const padYTop = (maxY - minY) * 0.18;
  minX = Math.max(0, minX - padX);
  maxX = Math.min(W, maxX + padX);
  minY = Math.max(0, minY - padYTop);
  maxY = Math.min(H, maxY + (maxY - minY) * 0.05);

  const scale = Math.max(8, maxX - minX);
  const pose = poseFromMatrix(matrix);

  let roll = pose.roll;
  if (!matrix || matrix.length < 16) {
    roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
  }

  const midX = (leftEye.x + rightEye.x) * 0.5;
  const headTop = {
    x: forehead.x * 0.7 + midX * 0.3,
    y: Math.min(foreheadUpper.y, forehead.y) - scale * 0.12,
  };

  return {
    bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    faceCentre: { x: nose.x, y: (forehead.y + chin.y) * 0.5 },
    forehead,
    headTop,
    leftEye,
    rightEye,
    leftEyeOuter: leftOuter,
    rightEyeOuter: rightOuter,
    scale,
    roll,
    pitch: pose.pitch,
    yaw: pose.yaw,
    confidence: 0.95,
    source: "mediapipe",
  };
}

/**
 * Lazy-init MediaPipe Face Landmarker (browser only).
 * Model + WASM download once; all subsequent inference is local.
 */
export function ensureFaceLandmarker(): Promise<FaceLandmarkerInstance | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (landmarker) return Promise.resolve(landmarker);
  if (initFailed) return Promise.resolve(null);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const { FaceLandmarker, FilesetResolver } = vision;
      const fileset = await FilesetResolver.forVisionTasks(WASM_CDN);
      const fl = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
      });
      landmarker = fl as unknown as FaceLandmarkerInstance;
      return landmarker;
    } catch (err) {
      console.warn("[face-track] MediaPipe Face Landmarker init failed; using skin fallback", err);
      initFailed = true;
      landmarker = null;
      return null;
    }
  })();

  return initPromise;
}

function detectWithLandmarker(
  src: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement,
  fl: FaceLandmarkerInstance,
): FaceLandmarks | null {
  const W =
    src instanceof HTMLVideoElement
      ? src.videoWidth
      : src instanceof HTMLImageElement
        ? src.naturalWidth || src.width
        : src.width;
  const H =
    src instanceof HTMLVideoElement
      ? src.videoHeight
      : src instanceof HTMLImageElement
        ? src.naturalHeight || src.height
        : src.height;
  if (W < 16 || H < 16) return null;

  try {
    const result = fl.detect(src);
    const faces = result?.faceLandmarks;
    if (!faces || faces.length === 0) return null;
    const matrix = result.facialTransformationMatrixes?.[0]?.data;
    return landmarksFromMediaPipe(faces[0], matrix, W, H);
  } catch {
    return null;
  }
}

// ---------- Skin fallback (only when MediaPipe unavailable) ----------

function isSkin(r: number, g: number, b: number): boolean {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return y > 40 && y < 240 && cb > 77 && cb < 127 && cr > 133 && cr < 173;
}

function skinFallback(src: HTMLCanvasElement): FaceLandmarks | null {
  const W = src.width;
  const H = src.height;
  if (W < 16 || H < 16) return null;
  let img: ImageData;
  try {
    const ctx = src.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    img = ctx.getImageData(0, 0, W, H);
  } catch {
    return null;
  }
  const d = img.data;
  const cell = Math.max(3, Math.floor(Math.min(W, H) / 48));
  let best = 0;
  let bx = 0;
  let by = 0;
  let bw = cell * 5;
  let bh = cell * 6;
  for (let y = 0; y < H - cell; y += cell) {
    for (let x = 0; x < W - cell; x += cell) {
      let skin = 0;
      let tot = 0;
      for (let dy = 0; dy < cell; dy += 2) {
        for (let dx = 0; dx < cell; dx += 2) {
          const i = ((y + dy) * W + (x + dx)) * 4;
          tot++;
          if (isSkin(d[i], d[i + 1], d[i + 2])) skin++;
        }
      }
      const score = skin / Math.max(1, tot);
      if (score > 0.28 && score > best) {
        best = score;
        bx = x;
        by = y;
        bw = cell * 5;
        bh = cell * 6;
      }
    }
  }
  if (best < 0.28) return null;
  const padX = Math.floor(bw * 0.55);
  const padYTop = Math.floor(bh * 0.75);
  const padYBot = Math.floor(bh * 0.55);
  const x = Math.max(0, bx - padX);
  const y = Math.max(0, by - padYTop);
  const w = Math.min(W - x, bw + padX * 2);
  const h = Math.min(H - y, bh + padYTop + padYBot);
  const leftEye = { x: x + w * 0.32, y: y + h * 0.38 };
  const rightEye = { x: x + w * 0.68, y: y + h * 0.38 };
  return {
    bounds: { x, y, w, h },
    faceCentre: { x: x + w * 0.5, y: y + h * 0.48 },
    forehead: { x: x + w * 0.5, y: y + h * 0.18 },
    headTop: { x: x + w * 0.5, y: y + h * 0.02 },
    leftEye,
    rightEye,
    leftEyeOuter: { x: x + w * 0.22, y: y + h * 0.38 },
    rightEyeOuter: { x: x + w * 0.78, y: y + h * 0.38 },
    scale: w,
    roll: 0,
    pitch: 0,
    yaw: 0,
    confidence: Math.min(0.55, 0.3 + best * 0.4),
    source: "skin",
  };
}

/**
 * Async detect — prefers MediaPipe (initializes on first call).
 * Returns null when no face is found.
 */
export async function detectFaceLandmarks(
  src: HTMLCanvasElement,
  _opts?: { preferDetector?: boolean },
): Promise<FaceLandmarks | null> {
  const fl = await ensureFaceLandmarker();
  if (fl) {
    const mp = detectWithLandmarker(src, fl);
    if (mp) return mp;
    return null;
  }
  return skinFallback(src);
}

/**
 * Sync detect for tight live loops.
 * Uses MediaPipe when already initialized; otherwise triggers init and uses skin fallback once.
 */
export function detectFaceLandmarksSync(src: HTMLCanvasElement): FaceLandmarks | null {
  if (landmarker) {
    const mp = detectWithLandmarker(src, landmarker);
    if (mp) return mp;
    return null;
  }
  if (typeof window !== "undefined" && !initFailed && !initPromise) {
    void ensureFaceLandmarker();
  }
  return skinFallback(src);
}

/** Whether MediaPipe landmarker is ready for real landmark inference. */
export function isMediaPipeReady(): boolean {
  return landmarker != null;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function lerpPt(a: FacePoint, b: FacePoint, t: number): FacePoint {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

export class FaceTrackSmoother {
  private prev: FaceLandmarks | null = null;
  private miss = 0;
  private readonly alpha: number;
  private readonly maxMiss: number;

  constructor(opts?: { alpha?: number; maxMiss?: number }) {
    this.alpha = opts?.alpha ?? 0.4;
    this.maxMiss = opts?.maxMiss ?? 8;
  }

  push(next: FaceLandmarks | null): FaceLandmarks | null {
    if (!next) {
      this.miss++;
      if (this.miss > this.maxMiss) {
        this.prev = null;
        return null;
      }
      return this.prev;
    }
    this.miss = 0;
    if (!this.prev) {
      this.prev = next;
      return next;
    }
    const t = this.alpha;
    const p = this.prev;
    const smoothed: FaceLandmarks = {
      bounds: {
        x: lerp(p.bounds.x, next.bounds.x, t),
        y: lerp(p.bounds.y, next.bounds.y, t),
        w: lerp(p.bounds.w, next.bounds.w, t),
        h: lerp(p.bounds.h, next.bounds.h, t),
      },
      faceCentre: lerpPt(p.faceCentre, next.faceCentre, t),
      forehead: lerpPt(p.forehead, next.forehead, t),
      headTop: lerpPt(p.headTop, next.headTop, t),
      leftEye: lerpPt(p.leftEye, next.leftEye, t),
      rightEye: lerpPt(p.rightEye, next.rightEye, t),
      leftEyeOuter: lerpPt(p.leftEyeOuter, next.leftEyeOuter, t),
      rightEyeOuter: lerpPt(p.rightEyeOuter, next.rightEyeOuter, t),
      scale: lerp(p.scale, next.scale, t),
      roll: lerp(p.roll, next.roll, t),
      pitch: lerp(p.pitch, next.pitch, t),
      yaw: lerp(p.yaw ?? 0, next.yaw ?? 0, t),
      confidence: lerp(p.confidence, next.confidence, t),
      source: next.source,
    };
    this.prev = smoothed;
    return smoothed;
  }

  reset(): void {
    this.prev = null;
    this.miss = 0;
  }

  get current(): FaceLandmarks | null {
    return this.prev;
  }
}

export function createTrackCanvas(maxEdge = 320): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = maxEdge;
  c.height = maxEdge;
  return c;
}

export function drawScaledForTrack(
  source: CanvasImageSource,
  trackCanvas: HTMLCanvasElement,
  srcW: number,
  srcH: number,
  maxEdge = 320,
): { scaleX: number; scaleY: number } {
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const tw = Math.max(1, Math.round(srcW * scale));
  const th = Math.max(1, Math.round(srcH * scale));
  if (trackCanvas.width !== tw || trackCanvas.height !== th) {
    trackCanvas.width = tw;
    trackCanvas.height = th;
  }
  const ctx = trackCanvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, 0, 0, tw, th);
  return { scaleX: srcW / tw, scaleY: srcH / th };
}

export function scaleLandmarks(
  lm: FaceLandmarks,
  scaleX: number,
  scaleY: number,
): FaceLandmarks {
  const sx = (p: FacePoint): FacePoint => ({ x: p.x * scaleX, y: p.y * scaleY });
  return {
    bounds: {
      x: lm.bounds.x * scaleX,
      y: lm.bounds.y * scaleY,
      w: lm.bounds.w * scaleX,
      h: lm.bounds.h * scaleY,
    },
    faceCentre: sx(lm.faceCentre),
    forehead: sx(lm.forehead),
    headTop: sx(lm.headTop),
    leftEye: sx(lm.leftEye),
    rightEye: sx(lm.rightEye),
    leftEyeOuter: sx(lm.leftEyeOuter),
    rightEyeOuter: sx(lm.rightEyeOuter),
    scale: lm.scale * scaleX,
    roll: lm.roll,
    pitch: lm.pitch,
    yaw: lm.yaw ?? 0,
    confidence: lm.confidence,
    source: lm.source,
  };
}

/** Release MediaPipe resources (call on leave Lens Studio). */
export function disposeFaceLandmarker(): void {
  try {
    landmarker?.close?.();
  } catch {
    /* ignore */
  }
  landmarker = null;
  initPromise = null;
  initFailed = false;
  videoTimestamp = 0;
}
