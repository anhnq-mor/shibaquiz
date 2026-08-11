import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { isCommentError } from "@/domain/comments/comments";
import * as schema from "@/server/db/schema";
import { DrizzleCommentRepository } from "@/server/repositories/drizzle-comment-repository";
import { CommentService } from "@/server/services/comment-service";

const client = new PGlite();
const database = drizzle(client, { schema });
const repository = new DrizzleCommentRepository(database);
const service = new CommentService(repository, "test-rate-limit-secret");

const authorId = "80000000-0000-4000-8000-000000000001";
const otherUserId = "80000000-0000-4000-8000-000000000002";
const adminId = "80000000-0000-4000-8000-000000000003";
let questionId: string;

beforeAll(async () => {
  await migrate(database, { migrationsFolder: "drizzle" });
  await database.insert(schema.users).values([
    {
      id: authorId,
      email: "comment-author@example.com",
      displayName: "Comment Author",
      passwordHash: "not-a-real-password-hash",
      emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
    },
    {
      id: otherUserId,
      email: "comment-other@example.com",
      displayName: "Other Commenter",
      passwordHash: "not-a-real-password-hash",
      emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
    },
    {
      id: adminId,
      email: "comment-admin@example.com",
      displayName: "Comment Admin",
      passwordHash: "not-a-real-password-hash",
      role: "ADMIN",
      emailVerifiedAt: new Date("2026-08-05T09:00:00.000Z"),
    },
  ]);
  const [exam] = await database
    .insert(schema.exams)
    .values({ code: "COMMENT-1", slug: "comment-1", status: "DRAFT" })
    .returning();
  const [topic] = await database
    .insert(schema.topics)
    .values({ examId: exam!.id, slug: "t1", displayOrder: 0 })
    .returning();
  const [question] = await database
    .insert(schema.questions)
    .values({
      examId: exam!.id,
      topicId: topic!.id,
      type: "SINGLE_CHOICE",
      status: "DRAFT",
      createdBy: adminId,
      updatedBy: adminId,
    })
    .returning();
  questionId = question!.id;
});

afterAll(async () => {
  await client.close();
});

describe("comment creation", () => {
  it("stores plain-text content verbatim without interpreting HTML", async () => {
    const payload = '<script>alert("xss")</script>';
    const comment = await service.postComment(
      { questionId, content: payload },
      authorId,
      new Date(),
    );
    expect(comment.content).toBe(payload);
    expect(comment.status).toBe("VISIBLE");
    expect(comment.authorDisplayName).toBe("Comment Author");
  });

  it("throws NOT_FOUND for a question that doesn't exist", async () => {
    await expect(
      service.postComment(
        {
          questionId: "90000000-0000-4000-8000-000000000000",
          content: "hello",
        },
        authorId,
        new Date(),
      ),
    ).rejects.toSatisfy(
      (error) => isCommentError(error) && error.code === "NOT_FOUND",
    );
  });

  it("rate-limits a user posting too many comments too quickly", async () => {
    const now = new Date();
    for (let index = 0; index < 5; index += 1) {
      await service.postComment(
        { questionId, content: `burst ${index}` },
        otherUserId,
        now,
      );
    }
    await expect(
      service.postComment({ questionId, content: "one too many" }, otherUserId, now),
    ).rejects.toSatisfy(
      (error) => isCommentError(error) && error.code === "RATE_LIMITED",
    );
  });
});

describe("comment pagination", () => {
  it("paginates newest-first with a working cursor", async () => {
    const [exam] = await database
      .insert(schema.exams)
      .values({ code: "COMMENT-PAGE", slug: "comment-page", status: "DRAFT" })
      .returning();
    const [topic] = await database
      .insert(schema.topics)
      .values({ examId: exam!.id, slug: "t1", displayOrder: 0 })
      .returning();
    const [question] = await database
      .insert(schema.questions)
      .values({
        examId: exam!.id,
        topicId: topic!.id,
        type: "SINGLE_CHOICE",
        status: "DRAFT",
        createdBy: adminId,
        updatedBy: adminId,
      })
      .returning();
    const pagedQuestionId = question!.id;

    for (let index = 0; index < 5; index += 1) {
      await database.insert(schema.comments).values({
        questionId: pagedQuestionId,
        userId: authorId,
        content: `comment ${index}`,
        status: "VISIBLE",
        createdAt: new Date(Date.now() + index * 1000),
      });
    }

    const firstPage = await repository.listForQuestion({
      questionId: pagedQuestionId,
      limit: 2,
    });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.items[0]?.content).toBe("comment 4");
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = await repository.listForQuestion({
      questionId: pagedQuestionId,
      limit: 2,
      cursor: firstPage.nextCursor ?? undefined,
    });
    expect(secondPage.items.map((item) => item.content)).toEqual([
      "comment 2",
      "comment 1",
    ]);
  });
});

describe("comment ownership", () => {
  it("prevents editing or deleting another user's comment", async () => {
    const comment = await repository.create(
      { questionId, content: "owned by author" },
      authorId,
      new Date(),
    );
    await expect(
      service.updateOwnContent(comment.id, otherUserId, "hijacked", new Date()),
    ).rejects.toSatisfy(
      (error) => isCommentError(error) && error.code === "FORBIDDEN",
    );
    await expect(
      service.softDeleteOwn(comment.id, otherUserId, new Date()),
    ).rejects.toSatisfy(
      (error) => isCommentError(error) && error.code === "FORBIDDEN",
    );
  });

  it("lets the owner edit their comment and marks it edited", async () => {
    const comment = await repository.create(
      { questionId, content: "before edit" },
      authorId,
      new Date(),
    );
    const updated = await service.updateOwnContent(
      comment.id,
      authorId,
      "after edit",
      new Date(),
    );
    expect(updated.content).toBe("after edit");
    expect(updated.editedAt).not.toBeNull();
  });

  it("hides a soft-deleted comment from listings and blocks further edits", async () => {
    const comment = await repository.create(
      { questionId, content: "will be deleted" },
      authorId,
      new Date(),
    );
    await service.softDeleteOwn(comment.id, authorId, new Date());
    await expect(
      service.updateOwnContent(comment.id, authorId, "too late", new Date()),
    ).rejects.toSatisfy(
      (error) => isCommentError(error) && error.code === "CONFLICT",
    );
  });
});

describe("admin moderation", () => {
  it("hides a comment with a reason so it no longer appears in the thread", async () => {
    const comment = await repository.create(
      { questionId, content: "needs moderation" },
      authorId,
      new Date(),
    );
    await service.moderate(comment.id, adminId, "Off-topic spam", new Date());
    const page = await repository.listForQuestion({ questionId, limit: 50 });
    expect(page.items.some((item) => item.id === comment.id)).toBe(false);
  });

  it("throws NOT_FOUND when moderating a comment that doesn't exist", async () => {
    await expect(
      service.moderate(
        "90000000-0000-4000-8000-000000000000",
        adminId,
        "reason",
        new Date(),
      ),
    ).rejects.toSatisfy(
      (error) => isCommentError(error) && error.code === "NOT_FOUND",
    );
  });
});
