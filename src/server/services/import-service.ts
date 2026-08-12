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

  enqueueImport(
    buffer: Uint8Array,
    format: ImportFormat,
    examId: string,
    fileName: string,
    actorUserId: string,
    now = new Date(),
  ) {
    return this.repository.enqueueImport(
      buffer,
      format,
      examId,
      fileName,
      actorUserId,
      now,
    );
  }

  processJob(jobId: string, now = new Date()) {
    return this.repository.processJob(jobId, now);
  }

  processNextJob(now = new Date()) {
    return this.repository.processNextJob(now);
  }

  listJobs(limit = 50) {
    return this.repository.listJobs(limit);
  }

  getJob(jobId: string) {
    return this.repository.getJob(jobId);
  }

  retryJob(jobId: string, actorUserId: string, now = new Date()) {
    return this.repository.retryJob(jobId, actorUserId, now);
  }

  requestCancel(jobId: string, actorUserId: string, now = new Date()) {
    return this.repository.requestCancel(jobId, actorUserId, now);
  }

  exportQuestions(examId: string) {
    return this.repository.exportQuestions(examId);
  }
}
