import { catalogs } from "../src/i18n/catalogs";
import { authCatalogs } from "../src/i18n/auth-catalogs";
import { adminCatalogs } from "../src/i18n/admin-catalogs";
import { quizCatalogs } from "../src/i18n/quiz-catalogs";

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
const viAdminKeys = leafPaths(adminCatalogs.vi).sort();
const enAdminKeys = leafPaths(adminCatalogs.en).sort();
const viQuizKeys = leafPaths(quizCatalogs.vi).sort();
const enQuizKeys = leafPaths(quizCatalogs.en).sort();

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

if (JSON.stringify(viAdminKeys) !== JSON.stringify(enAdminKeys)) {
  throw new Error(
    "Vietnamese and English admin catalogs do not contain the same keys",
  );
}

if (JSON.stringify(viQuizKeys) !== JSON.stringify(enQuizKeys)) {
  throw new Error(
    "Vietnamese and English quiz catalogs do not contain the same keys",
  );
}

process.stdout.write(
  `Catalog parity verified (${viKeys.length + viAuthKeys.length + viAdminKeys.length + viQuizKeys.length} keys per locale).\n`,
);
