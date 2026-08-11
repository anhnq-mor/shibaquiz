import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { entityIdSchema } from "@/domain/admin/content";
import { AuthError } from "@/domain/auth/auth";
import type { Locale } from "@/domain/common/locale";
import { isImportError } from "@/domain/import/import";
import type { ImportFormat } from "@/domain/import/spreadsheet";
import { authErrorResponse } from "@/server/http/auth-http";

const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

export async function parseImportRequest(
  request: Request,
): Promise<{ buffer: Uint8Array; format: ImportFormat; examId: string }> {
  const formData = await request.formData();
  const file = formData.get("file");
  const examIdRaw = formData.get("examId");
  if (!(file instanceof File) || typeof examIdRaw !== "string") {
    throw new AuthError("BAD_REQUEST", 400, "Missing file or examId");
  }
  if (file.size === 0 || file.size > MAX_IMPORT_FILE_BYTES) {
    throw new AuthError("BAD_REQUEST", 400, "File is empty or too large");
  }
  const { id: examId } = entityIdSchema.parse({ id: examIdRaw });
  const format: ImportFormat = file.name.toLowerCase().endsWith(".xlsx")
    ? "XLSX"
    : "CSV";
  const buffer = new Uint8Array(await file.arrayBuffer());
  return { buffer, format, examId };
}

const messages = {
  vi: {
    NOT_FOUND: "Không tìm thấy kỳ thi được yêu cầu.",
    INVALID_STRUCTURE:
      "Tệp có dữ liệu không hợp lệ. Không có gì được ghi vào hệ thống.",
    CONFLICT: "Xung đột dữ liệu khi nhập.",
  },
  en: {
    NOT_FOUND: "The requested exam was not found.",
    INVALID_STRUCTURE: "The file contains invalid data. Nothing was committed.",
    CONFLICT: "A data conflict occurred while importing.",
  },
} as const;

export function importErrorResponse(
  error: unknown,
  locale: Locale,
): NextResponse {
  if (isImportError(error)) {
    return NextResponse.json(
      {
        code: error.code,
        message: messages[locale][error.code],
        rows: error.rows,
        requestId: randomUUID(),
      },
      { status: error.status },
    );
  }
  return authErrorResponse(error, locale);
}
