import type { Locale } from "@/domain/common/locale";

export interface AdminCatalog {
  nav: {
    dashboard: string;
    exams: string;
    topics: string;
    questions: string;
    tests: string;
    backToSite: string;
  };
  forbidden: {
    title: string;
    description: string;
    homeLink: string;
  };
  dashboard: {
    title: string;
    description: string;
    exams: string;
    published: string;
    topics: string;
    questions: string;
    tests: string;
  };
  common: {
    save: string;
    saving: string;
    saved: string;
    create: string;
    edit: string;
    cancel: string;
    delete: string;
    deleteConfirm: string;
    deleted: string;
    requestFailed: string;
    connectionError: string;
    code: string;
    slug: string;
    name: string;
    description: string;
    status: string;
    statusDraft: string;
    statusPublished: string;
    statusArchived: string;
    primaryLocale: string;
    vietnameseTab: string;
    englishTab: string;
    englishOptional: string;
    missingTranslation: string;
    empty: string;
    exam: string;
    topic: string;
    selectExam: string;
    selectTopic: string;
    actions: string;
  };
  exams: {
    title: string;
    description: string;
    newAction: string;
    listHeading: string;
    enabledLocales: string;
    enableEnglish: string;
    enableEnglishWorking: string;
    enableEnglishEnabled: string;
    enableEnglishAlready: string;
    enableEnglishIncomplete: string;
    enableEnglishIncompleteCount: string;
  };
  topics: {
    title: string;
    description: string;
    newAction: string;
    listHeading: string;
    displayOrder: string;
  };
  questions: {
    title: string;
    description: string;
    newAction: string;
    listHeading: string;
    externalId: string;
    type: string;
    typeSingle: string;
    typeMultiple: string;
    content: string;
    explanation: string;
    options: string;
    optionLabel: string;
    optionText: string;
    optionCorrect: string;
    addOption: string;
    removeOption: string;
    filterKeyword: string;
    filterType: string;
    filterStatus: string;
    filterAll: string;
    version: string;
  };
  tests: {
    title: string;
    description: string;
    newAction: string;
    listHeading: string;
    type: string;
    typeFixed: string;
    typeDynamic: string;
    questionCount: string;
    durationMinutes: string;
    noTimeLimit: string;
    passingScore: string;
    shuffleQuestions: string;
    shuffleOptions: string;
    fixedQuestionsHeading: string;
    dynamicRulesHeading: string;
    percentage: string;
    percentageTotal: string;
    previewAction: string;
    previewHeading: string;
    previewTopic: string;
    previewPercentage: string;
    previewQuestionCount: string;
    previewAvailable: string;
    previewInsufficient: string;
  };
}

const vi: AdminCatalog = {
  nav: {
    dashboard: "Tổng quan",
    exams: "Kỳ thi",
    topics: "Chủ đề",
    questions: "Câu hỏi",
    tests: "Đề thi",
    backToSite: "Về trang chính",
  },
  forbidden: {
    title: "Không có quyền truy cập",
    description: "Khu vực này chỉ dành cho quản trị viên.",
    homeLink: "Về trang chủ",
  },
  dashboard: {
    title: "Quản trị nội dung",
    description: "Quản lý kỳ thi, chủ đề, câu hỏi và đề thi song ngữ.",
    exams: "Kỳ thi",
    published: "đã publish",
    topics: "Chủ đề",
    questions: "Câu hỏi",
    tests: "Đề thi",
  },
  common: {
    save: "Lưu",
    saving: "Đang lưu…",
    saved: "Đã lưu.",
    create: "Tạo mới",
    edit: "Sửa",
    cancel: "Hủy",
    delete: "Xóa",
    deleteConfirm: "Xóa mềm mục này? Attempt cũ vẫn giữ nguyên dữ liệu.",
    deleted: "Đã xóa mềm.",
    requestFailed: "Thao tác thất bại. Vui lòng kiểm tra dữ liệu và thử lại.",
    connectionError: "Không thể kết nối. Vui lòng thử lại.",
    code: "Mã",
    slug: "Slug",
    name: "Tên",
    description: "Mô tả",
    status: "Trạng thái",
    statusDraft: "Nháp",
    statusPublished: "Đã publish",
    statusArchived: "Đã lưu trữ",
    primaryLocale: "Ngôn ngữ chính",
    vietnameseTab: "Tiếng Việt",
    englishTab: "English",
    englishOptional: "Tùy chọn cho đến khi English được bật cho kỳ thi này.",
    missingTranslation: "Còn thiếu bản dịch",
    empty: "Chưa có dữ liệu.",
    exam: "Kỳ thi",
    topic: "Chủ đề",
    selectExam: "Chọn kỳ thi",
    selectTopic: "Chọn chủ đề",
    actions: "Thao tác",
  },
  exams: {
    title: "Kỳ thi",
    description:
      "Tạo và cập nhật kỳ thi. Chỉ publish khi có ít nhất một chủ đề và một câu hỏi hợp lệ đã publish.",
    newAction: "Thêm kỳ thi",
    listHeading: "Danh sách kỳ thi",
    enabledLocales: "Ngôn ngữ đã bật",
    enableEnglish: "Bật tiếng Anh",
    enableEnglishWorking: "Đang kiểm tra bản dịch…",
    enableEnglishEnabled: "Đã bật tiếng Anh cho kỳ thi này.",
    enableEnglishAlready: "Tiếng Anh đã được bật từ trước.",
    enableEnglishIncomplete:
      "Chưa thể bật tiếng Anh: còn thiếu bản dịch bắt buộc.",
    enableEnglishIncompleteCount: "Còn thiếu {count} mục bản dịch bắt buộc.",
  },
  topics: {
    title: "Chủ đề",
    description: "Quản lý chủ đề trong từng kỳ thi và thứ tự hiển thị.",
    newAction: "Thêm chủ đề",
    listHeading: "Danh sách chủ đề",
    displayOrder: "Thứ tự hiển thị",
  },
  questions: {
    title: "Câu hỏi",
    description:
      "Quản lý ngân hàng câu hỏi. Chọn một đáp án đúng cho câu đơn, ít nhất hai đáp án đúng và một đáp án sai cho câu nhiều lựa chọn.",
    newAction: "Thêm câu hỏi",
    listHeading: "Danh sách câu hỏi",
    externalId: "Mã ngoài (tùy chọn)",
    type: "Loại câu hỏi",
    typeSingle: "Một đáp án đúng",
    typeMultiple: "Nhiều đáp án đúng",
    content: "Nội dung câu hỏi",
    explanation: "Giải thích",
    options: "Lựa chọn",
    optionLabel: "Nhãn",
    optionText: "Nội dung lựa chọn",
    optionCorrect: "Đáp án đúng",
    addOption: "Thêm lựa chọn",
    removeOption: "Bỏ lựa chọn",
    filterKeyword: "Tìm theo từ khóa",
    filterType: "Loại",
    filterStatus: "Trạng thái",
    filterAll: "Tất cả",
    version: "Phiên bản",
  },
  tests: {
    title: "Đề thi",
    description:
      "Tạo đề cố định hoặc đề sinh động theo tỷ lệ chủ đề; xem trước số câu thực tế trước khi lưu.",
    newAction: "Thêm đề thi",
    listHeading: "Danh sách đề thi",
    type: "Kiểu đề",
    typeFixed: "Cố định",
    typeDynamic: "Sinh động",
    questionCount: "Số câu",
    durationMinutes: "Thời gian (phút)",
    noTimeLimit: "Không giới hạn thời gian",
    passingScore: "Điểm đạt (%)",
    shuffleQuestions: "Trộn thứ tự câu",
    shuffleOptions: "Trộn thứ tự đáp án",
    fixedQuestionsHeading: "Chọn câu hỏi đã publish",
    dynamicRulesHeading: "Tỷ lệ theo chủ đề",
    percentage: "Tỷ lệ (%)",
    percentageTotal: "Tổng tỷ lệ hiện tại",
    previewAction: "Xem trước phân bổ",
    previewHeading: "Kết quả xem trước",
    previewTopic: "Chủ đề",
    previewPercentage: "Tỷ lệ",
    previewQuestionCount: "Số câu phân bổ",
    previewAvailable: "Số câu sẵn có",
    previewInsufficient: "Ngân hàng câu hỏi không đủ",
  },
};

const en: AdminCatalog = {
  nav: {
    dashboard: "Dashboard",
    exams: "Exams",
    topics: "Topics",
    questions: "Questions",
    tests: "Tests",
    backToSite: "Back to site",
  },
  forbidden: {
    title: "Access denied",
    description: "This area is restricted to administrators.",
    homeLink: "Back to home",
  },
  dashboard: {
    title: "Content administration",
    description: "Manage bilingual exams, topics, questions, and tests.",
    exams: "Exams",
    published: "published",
    topics: "Topics",
    questions: "Questions",
    tests: "Tests",
  },
  common: {
    save: "Save",
    saving: "Saving…",
    saved: "Saved.",
    create: "Create",
    edit: "Edit",
    cancel: "Cancel",
    delete: "Delete",
    deleteConfirm: "Soft-delete this item? Existing attempts keep their data.",
    deleted: "Soft-deleted.",
    requestFailed: "The action failed. Check the data and try again.",
    connectionError: "Unable to connect. Please try again.",
    code: "Code",
    slug: "Slug",
    name: "Name",
    description: "Description",
    status: "Status",
    statusDraft: "Draft",
    statusPublished: "Published",
    statusArchived: "Archived",
    primaryLocale: "Primary locale",
    vietnameseTab: "Tiếng Việt",
    englishTab: "English",
    englishOptional: "Optional until English is enabled for this exam.",
    missingTranslation: "Translation missing",
    empty: "No data yet.",
    exam: "Exam",
    topic: "Topic",
    selectExam: "Select an exam",
    selectTopic: "Select a topic",
    actions: "Actions",
  },
  exams: {
    title: "Exams",
    description:
      "Create and update exams. Publishing requires at least one published topic and one valid published question.",
    newAction: "Add exam",
    listHeading: "Exam list",
    enabledLocales: "Enabled locales",
    enableEnglish: "Enable English",
    enableEnglishWorking: "Checking translations…",
    enableEnglishEnabled: "English is now enabled for this exam.",
    enableEnglishAlready: "English was already enabled.",
    enableEnglishIncomplete:
      "English cannot be enabled yet: required translations are missing.",
    enableEnglishIncompleteCount:
      "{count} required translation items are still missing.",
  },
  topics: {
    title: "Topics",
    description: "Manage topics within each exam and their display order.",
    newAction: "Add topic",
    listHeading: "Topic list",
    displayOrder: "Display order",
  },
  questions: {
    title: "Questions",
    description:
      "Manage the question bank. Single-choice needs exactly one correct option; multiple-choice needs at least two correct and one incorrect option.",
    newAction: "Add question",
    listHeading: "Question list",
    externalId: "External ID (optional)",
    type: "Question type",
    typeSingle: "Single choice",
    typeMultiple: "Multiple choice",
    content: "Question content",
    explanation: "Explanation",
    options: "Options",
    optionLabel: "Label",
    optionText: "Option content",
    optionCorrect: "Correct answer",
    addOption: "Add option",
    removeOption: "Remove option",
    filterKeyword: "Search by keyword",
    filterType: "Type",
    filterStatus: "Status",
    filterAll: "All",
    version: "Version",
  },
  tests: {
    title: "Tests",
    description:
      "Build fixed or topic-percentage tests, and preview the real per-topic count before saving.",
    newAction: "Add test",
    listHeading: "Test list",
    type: "Test type",
    typeFixed: "Fixed",
    typeDynamic: "Dynamic",
    questionCount: "Question count",
    durationMinutes: "Duration (minutes)",
    noTimeLimit: "No time limit",
    passingScore: "Passing score (%)",
    shuffleQuestions: "Shuffle questions",
    shuffleOptions: "Shuffle options",
    fixedQuestionsHeading: "Select published questions",
    dynamicRulesHeading: "Topic percentages",
    percentage: "Percentage (%)",
    percentageTotal: "Current total percentage",
    previewAction: "Preview allocation",
    previewHeading: "Preview result",
    previewTopic: "Topic",
    previewPercentage: "Percentage",
    previewQuestionCount: "Allocated questions",
    previewAvailable: "Available questions",
    previewInsufficient: "Question bank is insufficient",
  },
};

export const adminCatalogs: Record<Locale, AdminCatalog> = { vi, en };

export function getAdminMessages(locale: Locale): AdminCatalog {
  return adminCatalogs[locale];
}
