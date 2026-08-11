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
          { key: "Referrer-Policy", value: "strict-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
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
