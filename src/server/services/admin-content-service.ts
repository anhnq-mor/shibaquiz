import {
  assertQuestionCorrectness,
  assertUniqueTestStructure,
  type AdminContentRepository,
  type ContentStatus,
  type SaveExamInput,
  type SaveQuestionInput,
  type SaveTestInput,
  type SaveTopicInput,
} from "@/domain/admin/content";

export class AdminContentService {
  constructor(private readonly repository: AdminContentRepository) {}

  getWorkspace() {
    return this.repository.getWorkspace();
  }

  saveExam(input: SaveExamInput, actorUserId: string, now = new Date()) {
    return this.repository.saveExam(
      { ...input, code: input.code.toUpperCase() },
      actorUserId,
      now,
    );
  }

  saveTopic(input: SaveTopicInput, actorUserId: string, now = new Date()) {
    return this.repository.saveTopic(input, actorUserId, now);
  }

  async saveQuestion(
    input: SaveQuestionInput,
    actorUserId: string,
    now = new Date(),
  ) {
    assertQuestionCorrectness(input);
    return this.repository.saveQuestion(input, actorUserId, now);
  }

  deleteQuestion(id: string, actorUserId: string, now = new Date()) {
    return this.repository.deleteQuestion(id, actorUserId, now);
  }

  async previewTest(input: SaveTestInput) {
    assertUniqueTestStructure(input);
    return this.repository.previewTest(input);
  }

  async saveTest(input: SaveTestInput, actorUserId: string, now = new Date()) {
    assertUniqueTestStructure(input);
    return this.repository.saveTest(input, actorUserId, now);
  }

  bulkSetExamStatus(
    ids: string[],
    status: ContentStatus,
    actorUserId: string,
    now = new Date(),
  ) {
    return this.repository.bulkSetExamStatus(ids, status, actorUserId, now);
  }

  bulkSetTopicStatus(
    ids: string[],
    status: ContentStatus,
    actorUserId: string,
    now = new Date(),
  ) {
    return this.repository.bulkSetTopicStatus(ids, status, actorUserId, now);
  }

  bulkSetTestStatus(
    ids: string[],
    status: ContentStatus,
    actorUserId: string,
    now = new Date(),
  ) {
    return this.repository.bulkSetTestStatus(ids, status, actorUserId, now);
  }

  bulkSetQuestionStatus(
    ids: string[],
    status: ContentStatus,
    actorUserId: string,
    now = new Date(),
  ) {
    return this.repository.bulkSetQuestionStatus(ids, status, actorUserId, now);
  }

  bulkDeleteExams(ids: string[], actorUserId: string, now = new Date()) {
    return this.repository.bulkDeleteExams(ids, actorUserId, now);
  }

  bulkDeleteTopics(ids: string[], actorUserId: string, now = new Date()) {
    return this.repository.bulkDeleteTopics(ids, actorUserId, now);
  }

  bulkDeleteTests(ids: string[], actorUserId: string, now = new Date()) {
    return this.repository.bulkDeleteTests(ids, actorUserId, now);
  }

  bulkDeleteQuestions(ids: string[], actorUserId: string, now = new Date()) {
    return this.repository.bulkDeleteQuestions(ids, actorUserId, now);
  }
}
