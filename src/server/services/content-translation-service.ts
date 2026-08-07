import type {
  ContentTranslationRepository,
  EnableExamLocaleResult,
} from "@/domain/content/translations";
import type { Locale } from "@/domain/common/locale";

export class ContentTranslationService {
  constructor(
    private readonly repository: ContentTranslationRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  enableExamLocale(
    examId: string,
    locale: Locale,
  ): Promise<EnableExamLocaleResult> {
    return this.repository.enableExamLocale({
      examId,
      locale,
      now: this.now(),
    });
  }
}
