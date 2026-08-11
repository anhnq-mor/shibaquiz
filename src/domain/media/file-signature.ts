function matchesAt(
  bytes: Uint8Array,
  offset: number,
  pattern: number[],
): boolean {
  if (bytes.length < offset + pattern.length) return false;
  return pattern.every((value, index) => bytes[offset + index] === value);
}

function isIsoBaseMediaFile(bytes: Uint8Array): boolean {
  // ftyp box: 4-byte size, then the ASCII tag "ftyp" at offset 4.
  return matchesAt(bytes, 4, [0x66, 0x74, 0x79, 0x70]);
}

const signatureCheckers: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (bytes) => matchesAt(bytes, 0, [0xff, 0xd8, 0xff]),
  "image/png": (bytes) =>
    matchesAt(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/webp": (bytes) =>
    matchesAt(bytes, 0, [0x52, 0x49, 0x46, 0x46]) &&
    matchesAt(bytes, 8, [0x57, 0x45, 0x42, 0x50]),
  "image/gif": (bytes) =>
    matchesAt(bytes, 0, [0x47, 0x49, 0x46, 0x38]) &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61,
  "audio/mpeg": (bytes) =>
    matchesAt(bytes, 0, [0x49, 0x44, 0x33]) || // ID3 tag
    (bytes[0] === 0xff && (bytes[1] ?? 0) & 0xe0) === 0xe0, // MPEG frame sync
  "audio/mp4": isIsoBaseMediaFile,
  "audio/aac": (bytes) =>
    bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xf0) === 0xf0,
  "audio/ogg": (bytes) => matchesAt(bytes, 0, [0x4f, 0x67, 0x67, 0x53]),
  "video/mp4": isIsoBaseMediaFile,
  "video/webm": (bytes) => matchesAt(bytes, 0, [0x1a, 0x45, 0xdf, 0xa3]),
};

export const SIGNATURE_SNIFF_BYTE_LENGTH = 32;

export function matchesDeclaredSignature(
  bytes: Uint8Array,
  mimeType: string,
): boolean {
  const checker = signatureCheckers[mimeType];
  if (!checker) return false;
  return checker(bytes);
}
