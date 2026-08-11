type ContentSecurityPolicyOptions = {
  nonce: string;
  isDevelopment: boolean;
};

const cspNoncePattern = /^[A-Za-z0-9+/_=-]+$/;

export function createContentSecurityPolicy({
  nonce,
  isDevelopment,
}: ContentSecurityPolicyOptions) {
  if (!cspNoncePattern.test(nonce)) {
    throw new Error("CSP nonce contains invalid characters.");
  }

  const scriptSources = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data:",
    "media-src 'self' https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");
}
