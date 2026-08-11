import { describe, expect, it } from "vitest";

import { createContentSecurityPolicy } from "@/server/http/content-security-policy";

describe("content security policy", () => {
  it("allows only scripts carrying the per-request nonce in production", () => {
    const policy = createContentSecurityPolicy({
      nonce: "dGVzdC1ub25jZQ==",
      isDevelopment: false,
    });

    expect(policy).toContain(
      "script-src 'self' 'nonce-dGVzdC1ub25jZQ==' 'strict-dynamic'",
    );
    const scriptDirective = policy
      .split("; ")
      .find((directive) => directive.startsWith("script-src"));
    expect(scriptDirective).not.toContain("'unsafe-inline'");
    expect(scriptDirective).not.toContain("'unsafe-eval'");
    expect(policy).toContain("form-action 'self'");
  });

  it("allows React development diagnostics without weakening production", () => {
    expect(
      createContentSecurityPolicy({
        nonce: "development-nonce",
        isDevelopment: true,
      }),
    ).toContain("'unsafe-eval'");
  });

  it("rejects a nonce that could inject another CSP directive", () => {
    expect(() =>
      createContentSecurityPolicy({
        nonce: "unsafe'; script-src *",
        isDevelopment: false,
      }),
    ).toThrow(/invalid characters/i);
  });
});
