import { describe, expect, it } from "vitest";

import {
  buildImportRowInput,
  type ImportRowContext,
} from "@/domain/import/import";

function baseContext(
  overrides: Partial<ImportRowContext> = {},
): ImportRowContext {
  return {
    examId: "10000000-0000-4000-8000-000000000001",
    topicIdBySlug: new Map([
      ["algebra", "20000000-0000-4000-8000-000000000001"],
    ]),
    requiredLocales: () => ["vi"],
    readyMediaIds: new Set<string>(),
    ...overrides,
  };
}

function validRow(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    external_id: "",
    topic_slug: "algebra",
    type: "SINGLE_CHOICE",
    status: "DRAFT",
    content_vi: "1 + 1 = ?",
    explanation_vi: "Phép cộng cơ bản.",
    content_en: "",
    explanation_en: "",
    media_ids: "",
    option_1_label: "A",
    option_1_content_vi: "2",
    option_1_content_en: "",
    option_1_correct: "TRUE",
    option_2_label: "B",
    option_2_content_vi: "3",
    option_2_content_en: "",
    option_2_correct: "FALSE",
    ...overrides,
  };
}

describe("buildImportRowInput", () => {
  it("accepts a well-formed single-choice row", () => {
    const outcome = buildImportRowInput(validRow(), 2, baseContext());
    expect(outcome.status).toBe("VALID");
    if (outcome.status === "VALID") {
      expect(outcome.input.type).toBe("SINGLE_CHOICE");
      expect(outcome.input.topicId).toBe(
        "20000000-0000-4000-8000-000000000001",
      );
      expect(outcome.input.options).toHaveLength(2);
      expect(outcome.input.options[0]?.isCorrect).toBe(true);
      expect(outcome.input.translations).toEqual([
        {
          locale: "vi",
          content: "1 + 1 = ?",
          explanation: "Phép cộng cơ bản.",
        },
        {
          locale: "en",
          content: "1 + 1 = ?",
          explanation: "Phép cộng cơ bản.",
        },
      ]);
    }
  });

  it("mirrors English question and option text into missing Vietnamese fields", () => {
    const outcome = buildImportRowInput(
      validRow({
        content_vi: "",
        explanation_vi: "",
        content_en: "English question?",
        explanation_en: "English explanation.",
        option_1_content_vi: "",
        option_1_content_en: "Correct",
        option_2_content_vi: "",
        option_2_content_en: "Incorrect",
      }),
      2,
      baseContext(),
    );
    expect(outcome.status).toBe("VALID");
    if (outcome.status === "VALID") {
      expect(outcome.input.translations[0]).toMatchObject({
        locale: "vi",
        content: "English question?",
        explanation: "English explanation.",
      });
      expect(outcome.input.options[0]?.translations[0]).toMatchObject({
        locale: "vi",
        content: "Correct",
      });
    }
  });

  it("rejects an unknown topic_slug", () => {
    const outcome = buildImportRowInput(
      validRow({ topic_slug: "nope" }),
      2,
      baseContext(),
    );
    expect(outcome.status).toBe("ERROR");
    if (outcome.status === "ERROR") {
      expect(outcome.errors.join()).toMatch(/topic_slug/);
    }
  });

  it("accepts a true/false question type", () => {
    const outcome = buildImportRowInput(
      validRow({ type: "TRUE_FALSE" }),
      2,
      baseContext(),
    );
    expect(outcome.status).toBe("VALID");
  });

  it("accepts a matching row only with localized target content", () => {
    const outcome = buildImportRowInput(
      validRow({
        type: "MATCHING",
        option_1_correct: "FALSE",
        option_2_correct: "FALSE",
        option_1_match_vi: "Một",
        option_2_match_vi: "Hai",
      }),
      2,
      baseContext(),
    );
    expect(outcome.status).toBe("VALID");
    if (outcome.status === "VALID") {
      expect(outcome.input.options[0]?.translations).toEqual([
        { locale: "vi", content: "2", matchContent: "Một" },
        { locale: "en", content: "2", matchContent: "Một" },
      ]);
    }
  });

  it("still rejects a localized field when both language columns are blank", () => {
    const outcome = buildImportRowInput(
      validRow({ content_vi: "", content_en: "" }),
      2,
      baseContext(),
    );
    expect(outcome.status).toBe("ERROR");
  });

  it("rejects a single-choice row without exactly one correct option", () => {
    const outcome = buildImportRowInput(
      validRow({ option_1_correct: "FALSE", option_2_correct: "FALSE" }),
      2,
      baseContext(),
    );
    expect(outcome.status).toBe("ERROR");
    if (outcome.status === "ERROR") {
      expect(outcome.errors.join()).toMatch(/one correct option/);
    }
  });

  it("rejects a multiple-choice row with fewer than two correct options", () => {
    const outcome = buildImportRowInput(
      validRow({
        type: "MULTIPLE_CHOICE",
        option_1_correct: "TRUE",
        option_2_correct: "FALSE",
      }),
      2,
      baseContext(),
    );
    expect(outcome.status).toBe("ERROR");
  });

  it("rejects a media reference that isn't a READY asset", () => {
    const outcome = buildImportRowInput(
      validRow({ media_ids: "30000000-0000-4000-8000-000000000001" }),
      2,
      baseContext({ readyMediaIds: new Set() }),
    );
    expect(outcome.status).toBe("ERROR");
    if (outcome.status === "ERROR") {
      expect(outcome.errors.join()).toMatch(/not a Ready asset/);
    }
  });

  it("accepts a media reference that is a READY asset", () => {
    const mediaId = "30000000-0000-4000-8000-000000000001";
    const outcome = buildImportRowInput(
      validRow({ media_ids: mediaId }),
      2,
      baseContext({ readyMediaIds: new Set([mediaId]) }),
    );
    expect(outcome.status).toBe("VALID");
    if (outcome.status === "VALID") {
      expect(outcome.input.mediaIds).toEqual([mediaId]);
    }
  });

  it("satisfies required locales by mirroring the available localized content", () => {
    const outcome = buildImportRowInput(
      validRow({ status: "PUBLISHED" }),
      2,
      baseContext({ requiredLocales: () => ["vi", "en"] }),
    );
    expect(outcome.status).toBe("VALID");
    if (outcome.status === "VALID") {
      expect(
        outcome.input.translations.map((translation) => translation.locale),
      ).toEqual(["vi", "en"]);
    }
  });

  it("passes through a null external_id when the column is blank", () => {
    const outcome = buildImportRowInput(validRow(), 2, baseContext());
    expect(outcome.status).toBe("VALID");
    if (outcome.status === "VALID") {
      expect(outcome.externalId).toBeNull();
    }
  });

  it("keeps a provided external_id for upsert matching", () => {
    const outcome = buildImportRowInput(
      validRow({ external_id: "Q-001" }),
      2,
      baseContext(),
    );
    expect(outcome.status).toBe("VALID");
    if (outcome.status === "VALID") {
      expect(outcome.externalId).toBe("Q-001");
    }
  });

  it("skips option slots whose label column is blank", () => {
    const outcome = buildImportRowInput(
      validRow({ option_3_label: "", option_3_content_vi: "unused" }),
      2,
      baseContext(),
    );
    expect(outcome.status).toBe("VALID");
    if (outcome.status === "VALID") {
      expect(outcome.input.options).toHaveLength(2);
    }
  });
});
