import { z } from "zod";

export const commentStatuses = ["VISIBLE", "HIDDEN", "DELETED"] as const;
export type CommentStatus = (typeof commentStatuses)[number];

const idSchema = z.string().uuid();
const contentSchema = z.string().trim().min(1).max(2000);

export const createCommentSchema = z.object({
  questionId: idSchema,
  content: contentSchema,
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({ content: contentSchema });
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export const moderateCommentSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
export type ModerateCommentInput = z.infer<typeof moderateCommentSchema>;

export const commentListQuerySchema = z.object({
  questionId: idSchema,
  cursor: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CommentListQuery = z.infer<typeof commentListQuerySchema>;

export interface CommentSummary {
  id: string;
  questionId: string;
  userId: string;
  authorDisplayName: string;
  content: string;
  status: CommentStatus;
  editedAt: string | null;
  moderationReason: string | null;
  createdAt: string;
}

export class CommentError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "CONFLICT"
      | "RATE_LIMITED"
      | "INVALID_STRUCTURE",
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CommentError";
  }
}

export function isCommentError(error: unknown): error is CommentError {
  return (
    error instanceof Error &&
    error.name === "CommentError" &&
    typeof (error as CommentError).code === "string"
  );
}

export interface CommentRepository {
  listForQuestion(
    query: CommentListQuery,
  ): Promise<{ items: CommentSummary[]; nextCursor: string | null }>;
  create(
    input: CreateCommentInput,
    userId: string,
    now: Date,
  ): Promise<CommentSummary>;
  updateOwnContent(
    commentId: string,
    userId: string,
    content: string,
    now: Date,
  ): Promise<CommentSummary>;
  softDeleteOwn(commentId: string, userId: string, now: Date): Promise<void>;
  moderate(
    commentId: string,
    adminId: string,
    reason: string,
    now: Date,
  ): Promise<void>;
  consumeRateLimit(input: {
    keyHash: string;
    action: string;
    windowExpiresAt: Date;
    now: Date;
  }): Promise<number>;
}
