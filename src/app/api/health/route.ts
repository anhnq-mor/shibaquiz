import { NextResponse } from "next/server";

import { getDatabaseConnection } from "@/server/db/client";
import { PostgresSystemRepository } from "@/server/repositories/postgres-system-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  try {
    const connection = getDatabaseConnection();
    const system = new PostgresSystemRepository(connection.db);
    await system.ping();

    return NextResponse.json(
      { status: "ok", checks: { database: "ok" }, requestId },
      { headers: { "cache-control": "no-store", "x-request-id": requestId } },
    );
  } catch {
    console.error(
      JSON.stringify({
        level: "error",
        event: "health_check_failed",
        requestId,
      }),
    );
    return NextResponse.json(
      { status: "unavailable", checks: { database: "unavailable" }, requestId },
      {
        status: 503,
        headers: { "cache-control": "no-store", "x-request-id": requestId },
      },
    );
  }
}
