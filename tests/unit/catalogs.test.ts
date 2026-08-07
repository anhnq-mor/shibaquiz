import { describe, expect, it } from "vitest";

import { catalogs } from "@/i18n/catalogs";
import { authCatalogs } from "@/i18n/auth-catalogs";
import { adminCatalogs } from "@/i18n/admin-catalogs";

function paths(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const current = prefix ? `${prefix}.${key}` : key;
    return typeof child === "object" && child !== null
      ? paths(child, current)
      : [current];
  });
}

describe("translation catalogs", () => {
  it("keeps Vietnamese and English keys in parity", () => {
    expect(paths(catalogs.vi).sort()).toEqual(paths(catalogs.en).sort());
  });

  it("contains no empty UI messages", () => {
    for (const catalog of [
      ...Object.values(catalogs),
      ...Object.values(authCatalogs),
      ...Object.values(adminCatalogs),
    ]) {
      for (const path of paths(catalog)) {
        const value = path
          .split(".")
          .reduce<unknown>(
            (current, key) => (current as Record<string, unknown>)[key],
            catalog,
          );
        expect(value, path).toBeTypeOf("string");
        expect((value as string).trim(), path).not.toBe("");
      }
    }
  });

  it("keeps auth catalog keys in parity", () => {
    expect(paths(authCatalogs.vi).sort()).toEqual(
      paths(authCatalogs.en).sort(),
    );
  });

  it("keeps admin catalog keys in parity", () => {
    expect(paths(adminCatalogs.vi).sort()).toEqual(
      paths(adminCatalogs.en).sort(),
    );
  });
});
