import type { AuditLogQuery, AuditLogRepository } from "../domain/audit-log";

export class AuditLogService {
  constructor(private readonly repository: AuditLogRepository) {}

  list(query: AuditLogQuery) {
    return this.repository.list(query);
  }
}
