import { describe, expect, it } from "vitest";

import {
  matchesDeclaredSignature,
  SIGNATURE_SNIFF_BYTE_LENGTH,
} from "@/domain/media/file-signature";

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

describe("matchesDeclaredSignature", () => {
  it("accepts a real JPEG header", () => {
    expect(matchesDeclaredSignature(bytes(0xff, 0xd8, 0xff, 0xe0), "image/jpeg")).toBe(
      true,
    );
  });

  it("accepts a real PNG header", () => {
    expect(
      matchesDeclaredSignature(
        bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
        "image/png",
      ),
    ).toBe(true);
  });

  it("accepts a real WEBP header (RIFF....WEBP)", () => {
    const buffer = bytes(
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    );
    expect(matchesDeclaredSignature(buffer, "image/webp")).toBe(true);
  });

  it("accepts a real GIF header", () => {
    expect(
      matchesDeclaredSignature(
        bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61),
        "image/gif",
      ),
    ).toBe(true);
  });

  it("accepts MP3 via ID3 tag or MPEG frame sync", () => {
    expect(
      matchesDeclaredSignature(bytes(0x49, 0x44, 0x33, 0x04), "audio/mpeg"),
    ).toBe(true);
    expect(matchesDeclaredSignature(bytes(0xff, 0xfb, 0x90), "audio/mpeg")).toBe(
      true,
    );
  });

  it("accepts an ISO base media file (ftyp box) for mp4 audio and video", () => {
    const buffer = bytes(0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70);
    expect(matchesDeclaredSignature(buffer, "audio/mp4")).toBe(true);
    expect(matchesDeclaredSignature(buffer, "video/mp4")).toBe(true);
  });

  it("accepts AAC ADTS frame sync", () => {
    expect(matchesDeclaredSignature(bytes(0xff, 0xf1), "audio/aac")).toBe(true);
  });

  it("accepts an OGG header (OggS)", () => {
    expect(
      matchesDeclaredSignature(bytes(0x4f, 0x67, 0x67, 0x53), "audio/ogg"),
    ).toBe(true);
  });

  it("accepts a WEBM/EBML header", () => {
    expect(
      matchesDeclaredSignature(bytes(0x1a, 0x45, 0xdf, 0xa3), "video/webm"),
    ).toBe(true);
  });

  it("rejects bytes that don't match the declared MIME type", () => {
    expect(matchesDeclaredSignature(bytes(0x00, 0x01, 0x02), "image/jpeg")).toBe(
      false,
    );
    expect(
      matchesDeclaredSignature(
        bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
        "image/jpeg",
      ),
    ).toBe(false);
  });

  it("rejects an unrecognized MIME type outright", () => {
    expect(
      matchesDeclaredSignature(bytes(0xff, 0xd8, 0xff), "image/svg+xml"),
    ).toBe(false);
  });

  it("rejects a truncated buffer shorter than the signature", () => {
    expect(matchesDeclaredSignature(bytes(0x89, 0x50), "image/png")).toBe(false);
  });

  it("exposes the sniff length used to fetch header bytes", () => {
    expect(SIGNATURE_SNIFF_BYTE_LENGTH).toBeGreaterThanOrEqual(12);
  });
});
