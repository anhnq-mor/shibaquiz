import { z } from "zod";

const idSchema = z.string().uuid();

export const auditLogQuerySchema = z.object({
  cursor: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export interface AuditLogEntry {
  id: string;
  actorUserId: string | null;
  actorDisplayName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogRepository {
  list(
    query: AuditLogQuery,
  ): Promise<{ items: AuditLogEntry[]; nextCursor: string | null }>;
}
