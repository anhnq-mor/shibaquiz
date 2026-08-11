import type {
  AttemptRepository,
  HistoryFilterInput,
  SaveAnswerInput,
  StartAttemptInput,
} from "@/domain/attempts/attempt";
import type { Locale } from "@/domain/common/locale";

export class AttemptService {
  constructor(private readonly repository: AttemptRepository) {}

  startOrResumeAttempt(
    input: StartAttemptInput,
    userId: string,
    locale: Locale,
    now = new Date(),
  ) {
    return this.repository.startOrResumeAttempt(input, userId, locale, now);
  }

  getAttemptForTaking(attemptId: string, userId: string, now = new Date()) {
    return this.repository.getAttemptForTaking(attemptId, userId, now);
  }

  saveAnswer(
    attemptId: string,
    attemptQuestionId: string,
    userId: string,
    input: SaveAnswerInput,
    now = new Date(),
  ) {
    return this.repository.saveAnswer(
      attemptId,
      attemptQuestionId,
      userId,
      input,
      now,
    );
  }

  checkAnswer(
    attemptId: string,
    attemptQuestionId: string,
    userId: string,
    now = new Date(),
  ) {
    return this.repository.checkAnswer(
      attemptId,
      attemptQuestionId,
      userId,
      now,
    );
  }

  submitAttempt(attemptId: string, userId: string, now = new Date()) {
    return this.repository.submitAttempt(attemptId, userId, now);
  }

  abandonAttempt(attemptId: string, userId: string, now = new Date()) {
    return this.repository.abandonAttempt(attemptId, userId, now);
  }

  getAttemptResult(attemptId: string, userId: string, now = new Date()) {
    return this.repository.getAttemptResult(attemptId, userId, now);
  }

  listHistory(userId: string, filters: HistoryFilterInput) {
    return this.repository.listHistory(userId, filters);
  }
}
