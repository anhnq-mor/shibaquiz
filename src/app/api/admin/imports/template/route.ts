import { NextResponse } from "next/server";

import { buildImportTemplateRows } from "@/domain/import/import";
import { toCsv } from "@/domain/import/csv";
import { requireAdmin } from "@/server/auth/authorization";
import { importErrorResponse } from "@/server/http/import-http";

export async function GET() {
  try {
    await requireAdmin();
    const csv = toCsv(buildImportTemplateRows());
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="shibaquiz-import-template.csv"',
      },
    });
  } catch (error) {
    return importErrorResponse(error, "vi");
  }
}
