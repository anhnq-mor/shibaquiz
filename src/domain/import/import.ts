import {
  assertQuestionCorrectness,
  contentStatuses,
  questionTypes,
  saveQuestionSchema,
  type ContentStatus,
  type QuestionType,
  type SaveQuestionInput,
} from "@/domain/admin/content";
import type { Locale } from "@/domain/common/locale";
import type { ImportFormat } from "@/domain/import/spreadsheet";

export const IMPORT_MAX_OPTION_SLOTS = 20;

export const IMPORT_TEMPLATE_HEADERS = [
  "external_id",
  "topic_slug",
  "type",
  "status",
  "content_vi",
  "explanation_vi",
  "content_en",
  "explanation_en",
  "media_ids",
  ...Array.from({ length: IMPORT_MAX_OPTION_SLOTS }, (_, index) => [
    `option_${index + 1}_label`,
    `option_${index + 1}_content_vi`,
    `option_${index + 1}_content_en`,
    `option_${index + 1}_match_vi`,
    `option_${index + 1}_match_en`,
    `option_${index + 1}_correct`,
  ]).flat(),
];

const EXAMPLE_OPTIONS = [
  { label: "A", contentVi: "Lựa chọn A", correct: "TRUE" },
  { label: "B", contentVi: "Lựa chọn B", correct: "FALSE" },
];

export function buildImportTemplateRows(): string[][] {
  const fixedColumns = [
    "",
    "sample-topic-slug",
    "SINGLE_CHOICE",
    "DRAFT",
    "Nội dung câu hỏi mẫu?",
    "Giải thích mẫu.",
    "",
    "",
    "",
  ];
  const optionColumns = Array.from(
    { length: IMPORT_MAX_OPTION_SLOTS },
    (_, index) => {
      const example = EXAMPLE_OPTIONS[index];
      return example
        ? [example.label, example.contentVi, "", "", "", example.correct]
        : ["", "", "", "", "", ""];
    },
  ).flat();
  return [IMPORT_TEMPLATE_HEADERS, [...fixedColumns, ...optionColumns]];
}

export interface ImportRowContext {
  examId: string;
  topicIdBySlug: ReadonlyMap<string, string>;
  requiredLocales: (status: ContentStatus) => Locale[];
  readyMediaIds: ReadonlySet<string>;
}

export type ImportRowOutcome =
  | {
      rowNumber: number;
      status: "VALID";
      externalId: string | null;
      input: SaveQuestionInput;
    }
  | {
      rowNumber: number;
      status: "ERROR";
      externalId: string | null;
      errors: string[];
    };

function parseBoolean(value: string | undefined): boolean {
  return ["true", "1", "yes", "x", "correct"].includes(
    (value ?? "").trim().toLowerCase(),
  );
}

function splitIds(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function mirrorLocalizedValues(
  viValue: string | undefined,
  enValue: string | undefined,
): { vi: string; en: string } {
  const vi = viValue?.trim() ?? "";
  const en = enValue?.trim() ?? "";
  return {
    vi: vi || en,
    en: en || vi,
  };
}

export function buildImportRowInput(
  raw: Record<string, string>,
  rowNumber: number,
  context: ImportRowContext,
): ImportRowOutcome {
  const errors: string[] = [];

  const externalId = raw.external_id?.trim() || null;
  const topicSlug = raw.topic_slug?.trim() ?? "";
  const topicId = context.topicIdBySlug.get(topicSlug);
  if (!topicId) errors.push(`Unknown topic_slug "${topicSlug}"`);

  const type = (raw.type ?? "").trim().toUpperCase();
  if (!questionTypes.includes(type as QuestionType)) {
    errors.push(`Invalid type "${raw.type ?? ""}"`);
  }

  const status = (raw.status ?? "").trim().toUpperCase() || "DRAFT";
  if (!contentStatuses.includes(status as ContentStatus)) {
    errors.push(`Invalid status "${raw.status ?? ""}"`);
  }

  const mediaIds = raw.media_ids ? splitIds(raw.media_ids) : [];
  for (const mediaId of mediaIds) {
    if (!context.readyMediaIds.has(mediaId)) {
      errors.push(`Media asset ${mediaId} is not a Ready asset`);
    }
  }

  const translations: SaveQuestionInput["translations"] = [];
  const content = mirrorLocalizedValues(raw.content_vi, raw.content_en);
  const explanation = mirrorLocalizedValues(
    raw.explanation_vi,
    raw.explanation_en,
  );
  if (!content.vi) {
    errors.push(
      "content_vi/content_en: at least one question content value is required",
    );
  }
  if (content.vi) {
    translations.push({
      locale: "vi",
      content: content.vi,
      explanation: explanation.vi,
    });
  }
  if (content.en) {
    translations.push({
      locale: "en",
      content: content.en,
      explanation: explanation.en,
    });
  }

  const options: SaveQuestionInput["options"] = [];
  for (let slot = 1; slot <= IMPORT_MAX_OPTION_SLOTS; slot += 1) {
    const label = raw[`option_${slot}_label`]?.trim();
    if (!label) continue;
    const optionTranslations: SaveQuestionInput["options"][number]["translations"] =
      [];
    const optionContent = mirrorLocalizedValues(
      raw[`option_${slot}_content_vi`],
      raw[`option_${slot}_content_en`],
    );
    const matchContent = mirrorLocalizedValues(
      raw[`option_${slot}_match_vi`],
      raw[`option_${slot}_match_en`],
    );
    if (!optionContent.vi) {
      errors.push(
        `option_${slot}_content_vi/option_${slot}_content_en: at least one option content value is required`,
      );
    }
    if (type === "MATCHING" && !matchContent.vi) {
      errors.push(
        `option_${slot}_match_vi/option_${slot}_match_en: at least one matching target value is required`,
      );
    }
    if (optionContent.vi) {
      optionTranslations.push({
        locale: "vi",
        content: optionContent.vi,
        matchContent: matchContent.vi || null,
      });
    }
    if (optionContent.en) {
      optionTranslations.push({
        locale: "en",
        content: optionContent.en,
        matchContent: matchContent.en || null,
      });
    }
    options.push({
      label,
      isCorrect: parseBoolean(raw[`option_${slot}_correct`]),
      displayOrder: slot - 1,
      translations: optionTranslations,
    });
  }

  if (errors.length > 0 || !topicId) {
    return { rowNumber, status: "ERROR", externalId, errors };
  }

  const candidate: SaveQuestionInput = {
    id: undefined,
    externalId,
    examId: context.examId,
    topicId,
    type: type as QuestionType,
    status: status as ContentStatus,
    translations,
    options,
    mediaIds,
  };

  const parsed = saveQuestionSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      rowNumber,
      status: "ERROR",
      externalId,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "row"}: ${issue.message}`,
      ),
    };
  }

  const requiredLocales = context.requiredLocales(parsed.data.status);
  const presentLocales = new Set(
    parsed.data.translations.map((translation) => translation.locale),
  );
  const missingLocales = requiredLocales.filter(
    (locale) => !presentLocales.has(locale),
  );
  if (missingLocales.length > 0) {
    return {
      rowNumber,
      status: "ERROR",
      externalId,
      errors: [
        `Missing required translation for locale(s): ${missingLocales.join(", ")}`,
      ],
    };
  }
  for (const option of parsed.data.options) {
    const optionLocales = new Set(
      option.translations.map((translation) => translation.locale),
    );
    const missingOptionLocales = requiredLocales.filter(
      (locale) => !optionLocales.has(locale),
    );
    if (missingOptionLocales.length > 0) {
      return {
        rowNumber,
        status: "ERROR",
        externalId,
        errors: [
          `Option "${option.label}" is missing translation for locale(s): ${missingOptionLocales.join(", ")}`,
        ],
      };
    }
  }

  try {
    assertQuestionCorrectness(parsed.data);
  } catch (error) {
    return {
      rowNumber,
      status: "ERROR",
      externalId,
      errors: [
        error instanceof Error ? error.message : "Invalid option correctness",
      ],
    };
  }

  return { rowNumber, status: "VALID", externalId, input: parsed.data };
}

export interface ImportSummary {
  totalRows: number;
  validCount: number;
  errorCount: number;
  rows: ImportRowOutcome[];
}

export class ImportError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "INVALID_STRUCTURE" | "CONFLICT",
    public readonly status: number,
    message: string,
    public readonly rows?: Array<{
      rowNumber: number;
      externalId: string | null;
      errors: string[];
    }>,
  ) {
    super(message);
    this.name = "ImportError";
  }
}

export function isImportError(error: unknown): error is ImportError {
  return (
    error instanceof Error &&
    error.name === "ImportError" &&
    typeof (error as ImportError).code === "string"
  );
}

export interface ImportRepository {
  previewImport(
    buffer: Uint8Array,
    format: ImportFormat,
    examId: string,
  ): Promise<ImportSummary>;
  commitImport(
    buffer: Uint8Array,
    format: ImportFormat,
    examId: string,
    actorUserId: string,
    now: Date,
  ): Promise<{ createdCount: number; updatedCount: number }>;
  exportQuestions(examId: string): Promise<string[][]>;
}
