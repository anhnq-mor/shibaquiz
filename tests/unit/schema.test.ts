import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  attempts,
  attemptQuestions,
  auditLogs,
  authTokens,
  comments,
  exams,
  examTranslations,
  importJobs,
  mediaAssets,
  mediaTranslations,
  questionMedia,
  questionOptions,
  questionOptionTranslations,
  questions,
  questionTranslations,
  quizTests,
  rateLimits,
  sessions,
  testQuestions,
  testTopicRules,
  testTranslations,
  topics,
  topicTranslations,
  users,
} from "@/server/db/schema";

describe("initial relational schema", () => {
  it("models every logical entity and translation table from the specification", () => {
    const tableNames = [
      users,
      authTokens,
      sessions,
      exams,
      examTranslations,
      topics,
      topicTranslations,
      questions,
      questionTranslations,
      questionOptions,
      questionOptionTranslations,
      quizTests,
      rateLimits,
      testTranslations,
      testTopicRules,
      testQuestions,
      mediaAssets,
      mediaTranslations,
      questionMedia,
      attempts,
      attemptQuestions,
      comments,
      importJobs,
      auditLogs,
    ]
      .map(getTableName)
      .sort();

    expect(tableNames).toEqual(
      [
        "attempt_questions",
        "attempts",
        "audit_logs",
        "auth_tokens",
        "comments",
        "exam_translations",
        "exams",
        "import_jobs",
        "media_assets",
        "media_translations",
        "question_media",
        "question_option_translations",
        "question_options",
        "question_translations",
        "questions",
        "rate_limits",
        "sessions",
        "test_questions",
        "test_topic_rules",
        "test_translations",
        "tests",
        "topic_translations",
        "topics",
        "users",
      ].sort(),
    );
  });
});
