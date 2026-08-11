import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { getImportService } from "@/server/content/runtime";

export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }
  const job = await getImportService().processNextJob();
  return NextResponse.json({ processedJobId: job?.id ?? null });
}
