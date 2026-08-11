import type { attemptStatuses } from "@/domain/attempts/attempt";

export function attemptStatusTone(
  status: (typeof attemptStatuses)[number],
): string {
  return {
    IN_PROGRESS: "status-pill-info",
    SUBMITTED: "status-pill-positive",
    EXPIRED: "status-pill-warning",
    ABANDONED: "status-pill-negative",
  }[status];
}
