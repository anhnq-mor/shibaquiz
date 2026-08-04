import type { Locale } from "@/domain/common/locale";

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "LOCKED";
  preferredLocale: Locale | null;
}

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByNormalizedEmail(email: string): Promise<UserRecord | null>;
}

export interface PublishedExamSummary {
  id: string;
  code: string;
  slug: string;
  locale: Locale;
  name: string;
  description: string;
}

export interface ExamRepository {
  findPublishedBySlug(
    slug: string,
    locale: Locale,
  ): Promise<PublishedExamSummary | null>;
  listPublished(input: {
    locale: Locale;
    query?: string;
    limit: number;
    cursor?: string;
  }): Promise<PublishedExamSummary[]>;
}

export interface QuestionSourceRecord {
  id: string;
  examId: string;
  topicId: string;
  version: number;
}

export interface QuestionRepository {
  findPublishedSources(input: {
    examId: string;
    topicId?: string;
  }): Promise<QuestionSourceRecord[]>;
}

export interface AttemptRecord {
  id: string;
  userId: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "ABANDONED";
  locale: Locale;
}

export interface AttemptRepository {
  findOwnedById(
    attemptId: string,
    userId: string,
  ): Promise<AttemptRecord | null>;
}

export interface CommentRepository {
  countVisibleForQuestion(questionId: string): Promise<number>;
}

export interface MediaAssetRepository {
  findReadyById(id: string): Promise<{
    id: string;
    objectKey: string;
    objectVersion: string | null;
  } | null>;
}

export interface ImportJobRepository {
  findById(id: string): Promise<{ id: string; status: string } | null>;
}

export interface AuditLogRepository {
  append(event: {
    actorUserId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
}

export interface Repositories {
  users: UserRepository;
  exams: ExamRepository;
  questions: QuestionRepository;
  attempts: AttemptRepository;
  comments: CommentRepository;
  mediaAssets: MediaAssetRepository;
  importJobs: ImportJobRepository;
  auditLogs: AuditLogRepository;
}

export interface UnitOfWork {
  run<T>(operation: (repositories: Repositories) => Promise<T>): Promise<T>;
}

export interface SystemRepository {
  ping(): Promise<boolean>;
}

export interface FoundationSeedRepository {
  seedBilingualFoundation(): Promise<void>;
}
