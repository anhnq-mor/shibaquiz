import type { ImportRepository } from "@/domain/import/import";
import type { ImportFormat } from "@/domain/import/spreadsheet";

export class ImportService {
  constructor(private readonly repository: ImportRepository) {}

  previewImport(buffer: Uint8Array, format: ImportFormat, examId: string) {
    return this.repository.previewImport(buffer, format, examId);
  }

  commitImport(
    buffer: Uint8Array,
    format: ImportFormat,
    examId: string,
    actorUserId: string,
    now = new Date(),
  ) {
    return this.repository.commitImport(
      buffer,
      format,
      examId,
      actorUserId,
      now,
    );
  }

  exportQuestions(examId: string) {
    return this.repository.exportQuestions(examId);
  }
}
