/**
 * Camera Manager — Handles MediaStream lifecycle, permission requests, device switching.
 * Single source of truth for camera state and cleanup.
 */

export type CameraError = 
  | "permission-denied" 
  | "not-available" 
  | "not-supported" 
  | "unknown"
  | "switch-failed";

export type CameraFacingMode = "user" | "environment";

interface CameraConfig {
  facingMode: CameraFacingMode;
  width?: { ideal: number };
  height?: { ideal: number };
}

export class CameraManager {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private currentFacing: CameraFacingMode = "environment";

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (err) {
      return false;
    }
  }

  async start(
    videoElement: HTMLVideoElement,
    facingMode: CameraFacingMode = "environment"
  ): Promise<{ error?: CameraError }> {
    try {
      // Check support
      if (!navigator.mediaDevices?.getUserMedia) {
        return { error: "not-supported" };
      }

      // Stop existing stream
      this.stop();

      // Request with preferred resolution
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback: no constraints
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode },
            audio: false,
          });
        } catch {
          // Final fallback: any camera
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      this.stream = stream;
      this.video = videoElement;
      this.currentFacing = facingMode;

      // Apply mirror transform for front camera
      videoElement.srcObject = stream;
      videoElement.style.transform = facingMode === "user" ? "scaleX(-1)" : "none";

      // Wait for playback to be ready
      await new Promise<void>((resolve, reject) => {
        const onPlay = () => {
          videoElement.removeEventListener("play", onPlay);
          resolve();
        };
        const onError = () => {
          videoElement.removeEventListener("error", onError);
          reject(new Error("Video play failed"));
        };
        videoElement.addEventListener("play", onPlay);
        videoElement.addEventListener("error", onError);
        videoElement.play().catch(reject);
      });

      return {};
    } catch (err) {
      const msg = (err as Error).message || "";
      if (msg.includes("Permission") || msg.includes("NotAllowedError")) {
        return { error: "permission-denied" };
      }
      if (msg.includes("not found") || msg.includes("NotFoundError")) {
        return { error: "not-available" };
      }
      return { error: "unknown" };
    }
  }

  async switchCamera(): Promise<{ error?: CameraError }> {
    const next: CameraFacingMode = this.currentFacing === "user" ? "environment" : "user";
    if (!this.video) {
      return { error: "unknown" };
    }
    const result = await this.start(this.video, next);
    if (result.error) {
      return { error: "switch-failed" };
    }
    return {};
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
  }

  isActive(): boolean {
    return this.stream !== null && this.video !== null;
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.video;
  }

  getCurrentFacingMode(): CameraFacingMode {
    return this.currentFacing;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }
}

export const cameraManager = new CameraManager();
