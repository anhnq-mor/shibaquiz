import {
  CommentError,
  type CommentListQuery,
  type CommentRepository,
  type CreateCommentInput,
} from "@/domain/comments/comments";
import { hashRateLimitKey } from "@/server/auth/crypto";

const RATE_LIMIT_MAX_COMMENTS = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

export class CommentService {
  constructor(
    private readonly repository: CommentRepository,
    private readonly rateLimitSecret: string,
  ) {}

  listForQuestion(query: CommentListQuery) {
    return this.repository.listForQuestion(query);
  }

  async postComment(
    input: CreateCommentInput,
    userId: string,
    now = new Date(),
  ) {
    const attempt = await this.repository.consumeRateLimit({
      action: "COMMENT_CREATE",
      keyHash: hashRateLimitKey(this.rateLimitSecret, "COMMENT_CREATE", userId),
      windowExpiresAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS),
      now,
    });
    if (attempt > RATE_LIMIT_MAX_COMMENTS) {
      throw new CommentError("RATE_LIMITED", 429, "Too many comments; slow down");
    }
    return this.repository.create(input, userId, now);
  }

  updateOwnContent(
    commentId: string,
    userId: string,
    content: string,
    now = new Date(),
  ) {
    return this.repository.updateOwnContent(commentId, userId, content, now);
  }

  softDeleteOwn(commentId: string, userId: string, now = new Date()) {
    return this.repository.softDeleteOwn(commentId, userId, now);
  }

  moderate(commentId: string, adminId: string, reason: string, now = new Date()) {
    return this.repository.moderate(commentId, adminId, reason, now);
  }
}
