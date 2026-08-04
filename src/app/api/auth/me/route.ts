import { NextResponse } from "next/server";

import { getAuthService } from "@/server/auth/runtime";
import { readSessionCookie } from "@/server/auth/session-cookie";

export async function GET() {
  const user = await getAuthService().currentUser(await readSessionCookie());
  return NextResponse.json(
    { user },
    { headers: { "Cache-Control": "no-store" } },
  );
}
