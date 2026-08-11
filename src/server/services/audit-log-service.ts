import type { AuditLogQuery, AuditLogRepository } from "@/domain/admin/audit";

export class AuditLogService {
  constructor(private readonly repository: AuditLogRepository) {}

  list(query: AuditLogQuery) {
    return this.repository.list(query);
  }
}
