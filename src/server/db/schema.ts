import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { StoredQuestionSnapshot } from "@/domain/attempts/disclosure";
import type { AttemptAnswer } from "@/domain/attempts/answer";
import type { SaveQuestionInput } from "@/domain/admin/content";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const localeEnum = pgEnum("locale", ["vi", "en"]);
export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "LOCKED"]);
export const authTokenTypeEnum = pgEnum("auth_token_type", [
  "EMAIL_VERIFY",
  "PASSWORD_RESET",
]);
export const contentStatusEnum = pgEnum("content_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);
export const questionTypeEnum = pgEnum("question_type", [
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "MATCHING",
  "ORDERING",
]);
export const testTypeEnum = pgEnum("test_type", ["FIXED", "DYNAMIC"]);
export const attemptScopeEnum = pgEnum("attempt_scope", [
  "TOPIC",
  "FULL_TEST",
  "QUESTION_BANK",
]);
export const attemptModeEnum = pgEnum("attempt_mode", [
  "STUDY",
  "PRACTICE_IMMEDIATE",
  "EXAM_DEFERRED",
]);
export const attemptStatusEnum = pgEnum("attempt_status", [
  "IN_PROGRESS",
  "SUBMITTED",
  "EXPIRED",
  "ABANDONED",
]);
export const commentStatusEnum = pgEnum("comment_status", [
  "VISIBLE",
  "HIDDEN",
  "DELETED",
]);
export const mediaTypeEnum = pgEnum("media_type", ["IMAGE", "AUDIO", "VIDEO"]);
export const mediaStatusEnum = pgEnum("media_status", [
  "PENDING",
  "READY",
  "QUARANTINED",
  "DELETED",
]);
export const importModeEnum = pgEnum("import_mode", [
  "CREATE_ONLY",
  "UPSERT_BY_EXTERNAL_ID",
]);
export const importStatusEnum = pgEnum("import_status", [
  "UPLOADED",
  "VALIDATING",
  "VALIDATED",
  "COMMITTING",
  "CANCELLING",
  "CANCELLED",
  "COMPLETED",
  "FAILED",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").default("USER").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    emailVerificationExemptedAt: timestamp("email_verification_exempted_at", {
      withTimezone: true,
    }),
    status: userStatusEnum("status").default("ACTIVE").notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    preferredLocale: localeEnum("preferred_locale"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_normalized_unique").on(sql`lower(${table.email})`),
    index("users_role_status_idx").on(table.role, table.status),
  ],
);

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: authTokenTypeEnum("type").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("auth_tokens_hash_unique").on(table.tokenHash),
    index("auth_tokens_user_type_idx").on(table.userId, table.type),
    index("auth_tokens_expiry_idx").on(table.expiresAt),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionTokenHash: text("session_token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.sessionTokenHash),
    index("sessions_user_active_idx").on(
      table.userId,
      table.revokedAt,
      table.expiresAt,
    ),
  ],
);

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    slug: text("slug").notNull(),
    primaryLocale: localeEnum("primary_locale").default("vi").notNull(),
    enabledLocales: localeEnum("enabled_locales")
      .array()
      .default(sql`ARRAY['vi']::locale[]`)
      .notNull(),
    status: contentStatusEnum("status").default("DRAFT").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("exams_code_unique").on(table.code),
    uniqueIndex("exams_slug_unique").on(table.slug),
    index("exams_status_idx").on(table.status),
    check(
      "exams_enabled_locales_not_empty",
      sql`cardinality(${table.enabledLocales}) > 0`,
    ),
    check(
      "exams_primary_locale_enabled",
      sql`${table.primaryLocale} = any(${table.enabledLocales})`,
    ),
  ],
);

export const examTranslations = pgTable(
  "exam_translations",
  {
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    locale: localeEnum("locale").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.examId, table.locale] }),
    index("exam_translations_locale_name_idx").on(table.locale, table.name),
  ],
);

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    displayOrder: integer("display_order").notNull(),
    status: contentStatusEnum("status").default("DRAFT").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("topics_exam_slug_unique").on(table.examId, table.slug),
    index("topics_exam_status_order_idx").on(
      table.examId,
      table.status,
      table.displayOrder,
    ),
    check("topics_display_order_nonnegative", sql`${table.displayOrder} >= 0`),
  ],
);

export const topicTranslations = pgTable(
  "topic_translations",
  {
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    locale: localeEnum("locale").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.topicId, table.locale] })],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    externalId: text("external_id"),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "restrict" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "restrict" }),
    type: questionTypeEnum("type").notNull(),
    status: contentStatusEnum("status").default("DRAFT").notNull(),
    version: integer("version").default(1).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("questions_exam_external_id_unique")
      .on(table.examId, table.externalId)
      .where(sql`${table.externalId} is not null`),
    index("questions_filter_idx").on(
      table.examId,
      table.topicId,
      table.type,
      table.status,
    ),
    index("questions_deleted_at_idx").on(table.deletedAt),
    check("questions_version_positive", sql`${table.version} > 0`),
    check(
      "questions_deleted_are_archived",
      sql`${table.deletedAt} is null or ${table.status} = 'ARCHIVED'`,
    ),
  ],
);

export const questionTranslations = pgTable(
  "question_translations",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    locale: localeEnum("locale").notNull(),
    content: text("content").notNull(),
    explanation: text("explanation").notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.questionId, table.locale] }),
    check(
      "question_translation_content_length",
      sql`char_length(${table.content}) between 1 and 10000`,
    ),
    check(
      "question_translation_explanation_length",
      sql`char_length(${table.explanation}) <= 20000`,
    ),
  ],
);

export const questionOptions = pgTable(
  "question_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    isCorrect: boolean("is_correct").default(false).notNull(),
    displayOrder: integer("display_order").notNull(),
    matchTargetId: uuid("match_target_id").defaultRandom().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("question_options_question_label_unique").on(
      table.questionId,
      table.label,
    ),
    uniqueIndex("question_options_question_order_unique").on(
      table.questionId,
      table.displayOrder,
    ),
    uniqueIndex("question_options_match_target_unique").on(table.matchTargetId),
    check(
      "question_options_display_order_nonnegative",
      sql`${table.displayOrder} >= 0`,
    ),
  ],
);

export const questionOptionTranslations = pgTable(
  "question_option_translations",
  {
    optionId: uuid("option_id")
      .notNull()
      .references(() => questionOptions.id, { onDelete: "cascade" }),
    locale: localeEnum("locale").notNull(),
    content: text("content").notNull(),
    matchTargetContent: text("match_target_content"),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.optionId, table.locale] }),
    check(
      "question_option_translation_content_length",
      sql`char_length(${table.content}) between 1 and 10000`,
    ),
    check(
      "question_option_translation_match_content_length",
      sql`${table.matchTargetContent} is null or char_length(${table.matchTargetContent}) between 1 and 10000`,
    ),
  ],
);

export const quizTests = pgTable(
  "tests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "restrict" }),
    type: testTypeEnum("type").notNull(),
    status: contentStatusEnum("status").default("DRAFT").notNull(),
    questionCount: integer("question_count").notNull(),
    durationMinutes: integer("duration_minutes"),
    passingScorePercent: numeric("passing_score_percent", {
      precision: 5,
      scale: 2,
    }).notNull(),
    shuffleQuestions: boolean("shuffle_questions").default(false).notNull(),
    shuffleOptions: boolean("shuffle_options").default(false).notNull(),
    ...timestamps,
  },
  (table) => [
    index("tests_exam_status_idx").on(table.examId, table.status),
    check("tests_question_count_positive", sql`${table.questionCount} > 0`),
    check(
      "tests_duration_positive",
      sql`${table.durationMinutes} is null or ${table.durationMinutes} > 0`,
    ),
    check(
      "tests_passing_score_range",
      sql`${table.passingScorePercent} >= 0 and ${table.passingScorePercent} <= 100`,
    ),
  ],
);

export const testTranslations = pgTable(
  "test_translations",
  {
    testId: uuid("test_id")
      .notNull()
      .references(() => quizTests.id, { onDelete: "cascade" }),
    locale: localeEnum("locale").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.testId, table.locale] })],
);

export const testTopicRules = pgTable(
  "test_topic_rules",
  {
    testId: uuid("test_id")
      .notNull()
      .references(() => quizTests.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "restrict" }),
    percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.testId, table.topicId] }),
    check(
      "test_topic_rule_percentage_range",
      sql`${table.percentage} > 0 and ${table.percentage} <= 100`,
    ),
  ],
);

export const testQuestions = pgTable(
  "test_questions",
  {
    testId: uuid("test_id")
      .notNull()
      .references(() => quizTests.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    displayOrder: integer("display_order").notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.testId, table.questionId] }),
    uniqueIndex("test_questions_order_unique").on(
      table.testId,
      table.displayOrder,
    ),
    check(
      "test_questions_display_order_nonnegative",
      sql`${table.displayOrder} >= 0`,
    ),
  ],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: mediaTypeEnum("type").notNull(),
    status: mediaStatusEnum("status").default("PENDING").notNull(),
    objectKey: text("object_key").notNull(),
    objectVersion: text("object_version"),
    originalFileName: text("original_file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    checksum: text("checksum").notNull(),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: numeric("duration_seconds", { precision: 12, scale: 3 }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("media_assets_object_key_unique").on(table.objectKey),
    index("media_assets_status_created_idx").on(table.status, table.createdAt),
    check("media_assets_size_positive", sql`${table.sizeBytes} > 0`),
  ],
);

export const mediaTranslations = pgTable(
  "media_translations",
  {
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    locale: localeEnum("locale").notNull(),
    altText: text("alt_text"),
    caption: text("caption"),
    transcript: text("transcript"),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.mediaAssetId, table.locale] })],
);

export const questionMedia = pgTable(
  "question_media",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    displayOrder: integer("display_order").notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.questionId, table.mediaAssetId] }),
    uniqueIndex("question_media_order_unique").on(
      table.questionId,
      table.displayOrder,
    ),
    check(
      "question_media_display_order_range",
      sql`${table.displayOrder} between 0 and 4`,
    ),
  ],
);

export const attempts = pgTable(
  "attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "restrict" }),
    testId: uuid("test_id").references(() => quizTests.id, {
      onDelete: "restrict",
    }),
    scope: attemptScopeEnum("scope").notNull(),
    mode: attemptModeEnum("mode").notNull(),
    status: attemptStatusEnum("status").default("IN_PROGRESS").notNull(),
    locale: localeEnum("locale").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    scorePercent: numeric("score_percent", { precision: 5, scale: 2 }),
    correctCount: integer("correct_count"),
    incorrectCount: integer("incorrect_count"),
    unansweredCount: integer("unanswered_count"),
    generationConfigSnapshot: jsonb("generation_config_snapshot")
      .$type<Record<string, unknown>>()
      .notNull(),
    ...timestamps,
  },
  (table) => [
    index("attempts_user_started_idx").on(table.userId, table.startedAt),
    index("attempts_user_status_started_idx").on(
      table.userId,
      table.status,
      table.startedAt,
    ),
    index("attempts_exam_status_idx").on(table.examId, table.status),
    check(
      "attempts_score_range",
      sql`${table.scorePercent} is null or (${table.scorePercent} >= 0 and ${table.scorePercent} <= 100)`,
    ),
    check(
      "attempts_expiry_after_start",
      sql`${table.expiresAt} is null or ${table.expiresAt} > ${table.startedAt}`,
    ),
  ],
);

export const attemptQuestions = pgTable(
  "attempt_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    sourceQuestionId: uuid("source_question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "restrict" }),
    displayOrder: integer("display_order").notNull(),
    questionSnapshot: jsonb("question_snapshot")
      .$type<StoredQuestionSnapshot>()
      .notNull(),
    selectedOptionIds: jsonb("selected_option_ids")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    answerPayload: jsonb("answer_payload")
      .$type<AttemptAnswer>()
      .default(sql`'{"kind":"CHOICE","selectedOptionIds":[]}'::jsonb`)
      .notNull(),
    isFlagged: boolean("is_flagged").default(false).notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    isCorrect: boolean("is_correct"),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("attempt_questions_order_unique").on(
      table.attemptId,
      table.displayOrder,
    ),
    uniqueIndex("attempt_questions_source_unique").on(
      table.attemptId,
      table.sourceQuestionId,
    ),
    index("attempt_questions_attempt_state_idx").on(
      table.attemptId,
      table.checkedAt,
      table.isFlagged,
    ),
    check(
      "attempt_questions_display_order_nonnegative",
      sql`${table.displayOrder} >= 0`,
    ),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    content: text("content").notNull(),
    status: commentStatusEnum("status").default("VISIBLE").notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    moderatedBy: uuid("moderated_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    moderationReason: text("moderation_reason"),
    ...timestamps,
  },
  (table) => [
    index("comments_question_created_idx").on(
      table.questionId,
      table.createdAt,
    ),
    index("comments_user_created_idx").on(table.userId, table.createdAt),
    check(
      "comments_content_length",
      sql`char_length(${table.content}) between 1 and 2000`,
    ),
  ],
);

export const importJobs = pgTable(
  "import_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fileName: text("file_name").notNull(),
    examId: uuid("exam_id").references(() => exams.id, {
      onDelete: "restrict",
    }),
    mode: importModeEnum("mode").notNull(),
    status: importStatusEnum("status").default("UPLOADED").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    summary: jsonb("summary")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    errorReport: jsonb("error_report")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    totalRows: integer("total_rows").default(0).notNull(),
    processedRows: integer("processed_rows").default(0).notNull(),
    createdCount: integer("created_count").default(0).notNull(),
    updatedCount: integer("updated_count").default(0).notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    ...timestamps,
  },
  (table) => [
    index("import_jobs_creator_created_idx").on(
      table.createdBy,
      table.createdAt,
    ),
  ],
);

export const importJobRows = pgTable(
  "import_job_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => importJobs.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    externalId: text("external_id"),
    payload: jsonb("payload").$type<SaveQuestionInput>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("import_job_rows_job_row_unique").on(
      table.jobId,
      table.rowNumber,
    ),
    index("import_job_rows_job_idx").on(table.jobId),
  ],
);

export const importJobLogs = pgTable(
  "import_job_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => importJobs.id, { onDelete: "cascade" }),
    level: text("level").notNull(),
    event: text("event").notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("import_job_logs_job_created_idx").on(table.jobId, table.createdAt),
    check(
      "import_job_logs_level_check",
      sql`${table.level} in ('INFO', 'ERROR')`,
    ),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_created_idx").on(table.createdAt),
    index("audit_logs_entity_created_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
    index("audit_logs_actor_created_idx").on(
      table.actorUserId,
      table.createdAt,
    ),
  ],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    keyHash: text("key_hash").primaryKey(),
    action: text("action").notNull(),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    attemptCount: integer("attempt_count").default(1).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("rate_limits_expiry_idx").on(table.expiresAt),
    check("rate_limits_attempt_count_positive", sql`${table.attemptCount} > 0`),
  ],
);
