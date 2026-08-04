import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
) as {
  private?: boolean;
  license?: string;
};

if (packageJson.private !== true || packageJson.license !== "UNLICENSED") {
  throw new Error(
    "Until owner approval, the package must remain private and UNLICENSED",
  );
}

for (const requiredPath of [
  "docs/backlog.md",
  "docs/decisions/0001-application-architecture.md",
  "docs/decisions/0002-postgresql-repositories-and-migrations.md",
  "docs/decisions/0003-private-object-storage.md",
  "docs/decisions/0004-localization-snapshots-and-disclosure.md",
  "docs/decisions/0005-slice-1-scope-and-assumptions.md",
  ".github/workflows/ci.yml",
]) {
  if (!existsSync(join(root, requiredPath))) {
    throw new Error(`Missing required project artifact: ${requiredPath}`);
  }
}

const migrationDirectory = join(root, "drizzle");
if (
  !existsSync(migrationDirectory) ||
  !readdirSync(migrationDirectory).some(
    (file) =>
      statSync(join(migrationDirectory, file)).isFile() &&
      file.endsWith(".sql"),
  )
) {
  throw new Error("At least one versioned SQL migration is required");
}

process.stdout.write("Project metadata and migration artifacts verified.\n");
