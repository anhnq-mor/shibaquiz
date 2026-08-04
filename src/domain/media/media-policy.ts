export type MediaKind = "IMAGE" | "AUDIO" | "VIDEO";

const mimeKinds = {
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "image/webp": "IMAGE",
  "image/gif": "IMAGE",
  "audio/mpeg": "AUDIO",
  "audio/mp4": "AUDIO",
  "audio/aac": "AUDIO",
  "audio/ogg": "AUDIO",
  "video/mp4": "VIDEO",
  "video/webm": "VIDEO",
} as const satisfies Record<string, MediaKind>;

export interface MediaLimits {
  IMAGE: number;
  AUDIO: number;
  VIDEO: number;
}

export type MediaValidationResult =
  | { valid: true; kind: MediaKind }
  | {
      valid: false;
      code: "UNSUPPORTED_MEDIA_TYPE" | "INVALID_MEDIA_SIZE" | "MEDIA_TOO_LARGE";
    };

export function validateMediaDeclaration(
  input: { mimeType: string; sizeBytes: number },
  limits: MediaLimits,
): MediaValidationResult {
  const kind = mimeKinds[input.mimeType as keyof typeof mimeKinds];
  if (!kind) {
    return { valid: false, code: "UNSUPPORTED_MEDIA_TYPE" };
  }

  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    return { valid: false, code: "INVALID_MEDIA_SIZE" };
  }

  if (input.sizeBytes > limits[kind]) {
    return { valid: false, code: "MEDIA_TOO_LARGE" };
  }

  return { valid: true, kind };
}
