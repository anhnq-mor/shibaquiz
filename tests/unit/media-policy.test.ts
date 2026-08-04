import { describe, expect, it } from "vitest";

import { validateMediaDeclaration } from "@/domain/media/media-policy";
import { buildMediaObjectKey } from "@/server/storage/s3-media-storage";

const megabyte = 1024 * 1024;
const limits = {
  IMAGE: 5 * megabyte,
  AUDIO: 25 * megabyte,
  VIDEO: 100 * megabyte,
};

describe("media declaration policy", () => {
  it("accepts supported content within its type limit", () => {
    expect(
      validateMediaDeclaration(
        { mimeType: "image/webp", sizeBytes: megabyte },
        limits,
      ),
    ).toEqual({
      valid: true,
      kind: "IMAGE",
    });
  });

  it.each(["image/svg+xml", "text/html", "application/octet-stream"])(
    "rejects unsafe MIME %s",
    (mimeType) => {
      expect(
        validateMediaDeclaration({ mimeType, sizeBytes: 100 }, limits),
      ).toEqual({
        valid: false,
        code: "UNSUPPORTED_MEDIA_TYPE",
      });
    },
  );

  it("rejects a declaration above the media-specific size limit", () => {
    expect(
      validateMediaDeclaration(
        { mimeType: "audio/mpeg", sizeBytes: 26 * megabyte },
        limits,
      ),
    ).toEqual({
      valid: false,
      code: "MEDIA_TOO_LARGE",
    });
  });

  it("builds opaque keys inside the managed namespace", () => {
    expect(buildMediaObjectKey("b7f76a8b-6943-45d0-9020-1689b3956710")).toBe(
      "media/b7f76a8b-6943-45d0-9020-1689b3956710",
    );
    expect(() => buildMediaObjectKey("../../user-file.svg")).toThrow(
      /namespace/,
    );
  });
});
