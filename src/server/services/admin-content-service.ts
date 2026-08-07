import {
  assertQuestionCorrectness,
  assertUniqueTestStructure,
  type AdminContentRepository,
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
}
