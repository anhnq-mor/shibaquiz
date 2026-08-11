import { NextResponse } from "next/server";

import { entityIdSchema } from "@/domain/admin/content";
import { toCsv } from "@/domain/import/csv";
import { IMPORT_TEMPLATE_HEADERS } from "@/domain/import/import";
import { requireAdmin } from "@/server/auth/authorization";
import { getImportService } from "@/server/content/runtime";
import { importErrorResponse } from "@/server/http/import-http";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const examId = new URL(request.url).searchParams.get("examId") ?? "";
    entityIdSchema.parse({ id: examId });
    const rows = await getImportService().exportQuestions(examId);
    const csv = toCsv([IMPORT_TEMPLATE_HEADERS, ...rows]);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="shibaquiz-questions-export.csv"',
      },
    });
  } catch (error) {
    return importErrorResponse(error, "vi");
  }
}
