import { catalogs } from "../src/i18n/catalogs";
import { authCatalogs } from "../src/i18n/auth-catalogs";

function leafPaths(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "object" && child !== null
      ? leafPaths(child, path)
      : [path];
  });
}

const viKeys = leafPaths(catalogs.vi).sort();
const enKeys = leafPaths(catalogs.en).sort();
const viAuthKeys = leafPaths(authCatalogs.vi).sort();
const enAuthKeys = leafPaths(authCatalogs.en).sort();

if (JSON.stringify(viKeys) !== JSON.stringify(enKeys)) {
  throw new Error(
    "Vietnamese and English catalogs do not contain the same keys",
  );
}

if (JSON.stringify(viAuthKeys) !== JSON.stringify(enAuthKeys)) {
  throw new Error(
    "Vietnamese and English auth catalogs do not contain the same keys",
  );
}

process.stdout.write(
  `Catalog parity verified (${viKeys.length + viAuthKeys.length} keys per locale).\n`,
);
