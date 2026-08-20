/** Shared editor constants (image + video workspaces). */

/** Max image upload size (phone HEIC/JPEG often 15–35 MB). */
export const MAX_IMAGE_MB = 40;

/** Max video upload size. */
export const MAX_VIDEO_MB = 200;

export const LOADING_MESSAGES = [
  "Preparing your request…",
  "Sending to the creative engine…",
  "Generating…",
  "Almost ready…",
] as const;
