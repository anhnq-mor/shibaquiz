import type { Locale } from "@/domain/common/locale";

export interface TranslationCompletenessReport {
  complete: boolean;
  missingExamTranslations: number;
  missingTopicTranslations: number;
  missingQuestionTranslations: number;
  missingOptionTranslations: number;
  missingTestTranslations: number;
  missingMediaAccessibilityTranslations: number;
}

export type EnableExamLocaleResult =
  | { status: "EXAM_NOT_FOUND" }
  | { status: "INCOMPLETE"; report: TranslationCompletenessReport }
  | {
      status: "ENABLED" | "ALREADY_ENABLED";
      report: TranslationCompletenessReport;
    };

export interface ContentTranslationRepository {
  enableExamLocale(input: {
    examId: string;
    locale: Locale;
    now: Date;
  }): Promise<EnableExamLocaleResult>;
}
