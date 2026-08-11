import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin import wizard file lifecycle", () => {
  const source = readFileSync("src/components/admin/import-wizard.tsx", "utf8");
  const confirmCommitSource = source.slice(
    source.indexOf("async function confirmCommit"),
    source.indexOf("function startOver"),
  );

  it("retains the selected file after the file input unmounts for Review", () => {
    expect(source).toContain(
      "const [selectedFile, setSelectedFile] = useState<File | null>(null)",
    );
    expect(source).toContain("setSelectedFile(file)");
    expect(confirmCommitSource).toContain("const file = selectedFile;");
    expect(confirmCommitSource).not.toContain("fileInputRef.current?.files");
  });

  it("reports missing file state instead of silently returning", () => {
    expect(confirmCommitSource).toMatch(
      /if \(!examId \|\| !file\) \{[\s\S]*setError\(messages\.imports\.noFileError\);[\s\S]*setStep\("select"\);/,
    );
  });

  it("explains why Confirm is disabled for a preview with row errors", () => {
    expect(source).toContain('id="import-errors-notice"');
    expect(source).toContain("messages.imports.confirmBlockedAction");
    expect(source).toContain("messages.imports.confirmBlockedHint");
    expect(source).toContain('"import-errors-notice"');
  });
});
