import type { ContentStatus } from "@/domain/admin/content";

export function contentStatusTone(status: ContentStatus): string {
  return {
    DRAFT: "status-pill-neutral",
    PUBLISHED: "status-pill-positive",
    ARCHIVED: "status-pill-negative",
  }[status];
}
