import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AuthForm } from "@/components/auth/auth-form";
import { getAuthMessages } from "@/i18n/auth-catalogs";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("authentication form fallback", () => {
  it("uses POST for login even before client-side hydration", () => {
    const html = renderToStaticMarkup(
      createElement(AuthForm, {
        mode: "login",
        locale: "vi",
        messages: getAuthMessages("vi"),
      }),
    );

    expect(html).toContain('action="/api/auth/login"');
    expect(html).toContain('method="post"');
    expect(html).not.toContain("?email=");
  });
});
