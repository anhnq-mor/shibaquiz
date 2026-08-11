// Development-only allowlist for `/_next/*` assets and the HMR websocket when the
// dev server is opened from another device on the same private network. Next.js
// otherwise blocks those cross-origin dev requests. Production ignores this option;
// runtime mutations stay guarded by `assertTrustedOrigin`.
const developmentLanOrigins = (
  process.env.DEV_ALLOWED_ORIGINS ?? "192.168.*.*,10.*.*.*,172.*.*.*"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// The media object-storage endpoint (MinIO locally, S3 in production) serves
// signed image/audio/video URLs from an origin outside the app itself, so the
// CSP's img-src/media-src must allow it explicitly instead of only 'self'.
function mediaStorageOrigin() {
  if (!process.env.MEDIA_S3_ENDPOINT) return null;
  try {
    return new URL(process.env.MEDIA_S3_ENDPOINT).origin;
  } catch {
    return null;
  }
}

function contentSecurityPolicy() {
  const mediaOrigin = mediaStorageOrigin();
  const mediaSources = ["'self'", "https:", mediaOrigin]
    .filter(Boolean)
    .join(" ");
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${mediaSources} data:`,
    `media-src ${mediaSources}`,
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  serverExternalPackages: ["@electric-sql/pglite"],
  allowedDevOrigins: developmentLanOrigins,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
