import { and, eq, isNull, sql } from "drizzle-orm";

import {
  CommentError,
  type CommentListQuery,
  type CommentRepository,
  type CommentSummary,
  type CreateCommentInput,
} from "@/domain/comments/comments";
import type { Database } from "@/server/db/client";
import { comments, questions, rateLimits, users } from "@/server/db/schema";

function toSummary(
  row: typeof comments.$inferSelect,
  authorDisplayName: string,
): CommentSummary {
  return {
    id: row.id,
    questionId: row.questionId,
    userId: row.userId,
    authorDisplayName,
    content: row.content,
    status: row.status,
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
    moderationReason: row.moderationReason,
    createdAt: row.createdAt.toISOString(),
  };
}

export class DrizzleCommentRepository implements CommentRepository {
  constructor(private readonly database: Database) {}

  async listForQuestion(
    query: CommentListQuery,
  ): Promise<{ items: CommentSummary[]; nextCursor: string | null }> {
    const conditions = [
      eq(comments.questionId, query.questionId),
      eq(comments.status, "VISIBLE" as const),
    ];
    if (query.cursor) {
      const cursorRow = (
        await this.database
          .select({ createdAt: comments.createdAt })
          .from(comments)
          .where(eq(comments.id, query.cursor))
          .limit(1)
      )[0];
      if (cursorRow) {
        conditions.push(
          sql`(${comments.createdAt}, ${comments.id}) < (${cursorRow.createdAt}, ${query.cursor})`,
        );
      }
    }

    const rows = await this.database
      .select({ comment: comments, authorDisplayName: users.displayName })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.userId))
      .where(and(...conditions))
      .orderBy(sql`${comments.createdAt} desc, ${comments.id} desc`)
      .limit(query.limit + 1);

    const page = rows.slice(0, query.limit);
    const nextCursor =
      rows.length > query.limit ? page.at(-1)!.comment.id : null;
    return {
      items: page.map((row) => toSummary(row.comment, row.authorDisplayName)),
      nextCursor,
    };
  }

  async create(
    input: CreateCommentInput,
    userId: string,
    now: Date,
  ): Promise<CommentSummary> {
    const question = (
      await this.database
        .select({ id: questions.id })
        .from(questions)
        .where(
          and(eq(questions.id, input.questionId), isNull(questions.deletedAt)),
        )
        .limit(1)
    )[0];
    if (!question) {
      throw new CommentError("NOT_FOUND", 404, "Question not found");
    }

    const [inserted] = await this.database
      .insert(comments)
      .values({
        questionId: input.questionId,
        userId,
        content: input.content,
        status: "VISIBLE",
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const author = (
      await this.database
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
    )[0];
    return toSummary(inserted!, author?.displayName ?? "");
  }

  private async loadOwned(
    commentId: string,
    userId: string,
  ): Promise<typeof comments.$inferSelect> {
    const row = (
      await this.database
        .select()
        .from(comments)
        .where(eq(comments.id, commentId))
        .limit(1)
    )[0];
    if (!row) throw new CommentError("NOT_FOUND", 404, "Comment not found");
    if (row.userId !== userId) {
      throw new CommentError("FORBIDDEN", 403, "You do not own this comment");
    }
    return row;
  }

  async updateOwnContent(
    commentId: string,
    userId: string,
    content: string,
    now: Date,
  ): Promise<CommentSummary> {
    const existing = await this.loadOwned(commentId, userId);
    if (existing.status !== "VISIBLE") {
      throw new CommentError(
        "CONFLICT",
        409,
        "This comment can no longer be edited",
      );
    }
    const [updated] = await this.database
      .update(comments)
      .set({ content, editedAt: now, updatedAt: now })
      .where(eq(comments.id, commentId))
      .returning();
    const author = (
      await this.database
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
    )[0];
    return toSummary(updated!, author?.displayName ?? "");
  }

  async softDeleteOwn(
    commentId: string,
    userId: string,
    now: Date,
  ): Promise<void> {
    const existing = await this.loadOwned(commentId, userId);
    if (existing.status === "DELETED") return;
    await this.database
      .update(comments)
      .set({ status: "DELETED", updatedAt: now })
      .where(eq(comments.id, commentId));
  }

  async moderate(
    commentId: string,
    adminId: string,
    reason: string,
    now: Date,
  ): Promise<void> {
    const existing = (
      await this.database
        .select({ id: comments.id })
        .from(comments)
        .where(eq(comments.id, commentId))
        .limit(1)
    )[0];
    if (!existing) {
      throw new CommentError("NOT_FOUND", 404, "Comment not found");
    }
    await this.database
      .update(comments)
      .set({
        status: "HIDDEN",
        moderatedBy: adminId,
        moderationReason: reason,
        updatedAt: now,
      })
      .where(eq(comments.id, commentId));
  }

  async consumeRateLimit(input: {
    keyHash: string;
    action: string;
    windowExpiresAt: Date;
    now: Date;
  }): Promise<number> {
    const rows = await this.database
      .insert(rateLimits)
      .values({
        keyHash: input.keyHash,
        action: input.action,
        windowStartedAt: input.now,
        attemptCount: 1,
        expiresAt: input.windowExpiresAt,
      })
      .onConflictDoUpdate({
        target: rateLimits.keyHash,
        set: {
          action: input.action,
          windowStartedAt: sql`case when ${rateLimits.expiresAt} <= ${input.now} then ${input.now} else ${rateLimits.windowStartedAt} end`,
          attemptCount: sql`case when ${rateLimits.expiresAt} <= ${input.now} then 1 else ${rateLimits.attemptCount} + 1 end`,
          expiresAt: sql`case when ${rateLimits.expiresAt} <= ${input.now} then ${input.windowExpiresAt} else ${rateLimits.expiresAt} end`,
          updatedAt: input.now,
        },
      })
      .returning();
    return rows[0]?.attemptCount ?? 1;
  }
}
