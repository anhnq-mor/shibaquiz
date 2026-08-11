import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("background import job delivery", () => {
  const commitRoute = readFileSync(
    "src/app/api/admin/imports/commit/route.ts",
    "utf8",
  );
  const monitor = readFileSync(
    "src/components/admin/import-jobs-monitor.tsx",
    "utf8",
  );
  const schema = readFileSync("src/server/db/schema.ts", "utf8");

  it("acknowledges the job before processing it after the response", () => {
    expect(commitRoute).toContain("enqueueImport");
    expect(commitRoute).toContain("after(() => service.processJob(job.id))");
    expect(commitRoute).toContain("status: 202");
  });

  it("stages canonical rows and operational logs without source binary", () => {
    expect(schema).toContain('"import_job_rows"');
    expect(schema).toContain('"import_job_logs"');
    expect(schema).toContain('jsonb("payload")');
    expect(schema).not.toMatch(
      /importJobs[\s\S]{0,1200}(binary|bytea|fileData)/i,
    );
  });

  it("polls active jobs and exposes logs and retry", () => {
    expect(monitor).toContain("window.setInterval");
    expect(monitor).toContain("2_000");
    expect(monitor).toContain("job.logs.map");
    expect(monitor).toContain("/retry");
    expect(monitor).toContain('job.status === "FAILED"');
    expect(monitor).toContain("logMessage(log.event, messages)");
    expect(monitor).toContain("messages.imports.jobFailedMessage");
  });
});
