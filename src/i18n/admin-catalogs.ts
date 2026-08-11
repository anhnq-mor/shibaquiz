import type { Locale } from "@/domain/common/locale";

export interface AdminCatalog {
  nav: {
    dashboard: string;
    exams: string;
    topics: string;
    questions: string;
    tests: string;
    media: string;
    imports: string;
    users: string;
    audit: string;
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
    apply: string;
    loadMore: string;
    moveUp: string;
    moveDown: string;
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
    typeTrueFalse: string;
    typeMatching: string;
    typeOrdering: string;
    content: string;
    explanation: string;
    options: string;
    optionLabel: string;
    optionText: string;
    optionCorrect: string;
    matchTargetText: string;
    orderingHint: string;
    addOption: string;
    removeOption: string;
    filterKeyword: string;
    filterType: string;
    filterStatus: string;
    filterAll: string;
    version: string;
    mediaHeading: string;
    mediaEmpty: string;
    mediaLimitReached: string;
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
  media: {
    title: string;
    description: string;
    uploadAction: string;
    uploading: string;
    processing: string;
    listHeading: string;
    fileName: string;
    type: string;
    typeImage: string;
    typeAudio: string;
    typeVideo: string;
    sizeBytes: string;
    status: string;
    statusPending: string;
    statusReady: string;
    statusQuarantined: string;
    statusDeleted: string;
    referencedBy: string;
    filterType: string;
    filterStatus: string;
    filterAll: string;
    filterKeyword: string;
    preview: string;
    altText: string;
    caption: string;
    transcript: string;
    editTranslations: string;
    deleteBlocked: string;
    uploadFailed: string;
    unsupportedType: string;
    tooLarge: string;
  };
  imports: {
    title: string;
    description: string;
    selectExamLabel: string;
    chooseFileLabel: string;
    downloadTemplateAction: string;
    exportAction: string;
    previewAction: string;
    previewHeading: string;
    totalRowsLabel: string;
    validRowsLabel: string;
    errorRowsLabel: string;
    rowNumberLabel: string;
    rowExternalIdLabel: string;
    rowErrorsLabel: string;
    errorRowNumbersLabel: string;
    questionContentRequiredError: string;
    optionContentRequiredError: string;
    matchTargetRequiredError: string;
    confirmAction: string;
    confirmBlockedAction: string;
    confirmBlockedHint: string;
    backAction: string;
    committing: string;
    commitSuccessHeading: string;
    createdCountLabel: string;
    updatedCountLabel: string;
    backToQuestions: string;
    noFileError: string;
    fixErrorsNotice: string;
    previewing: string;
    startOverAction: string;
    queuedHeading: string;
    queuedDescription: string;
    viewJobsAction: string;
    jobsTitle: string;
    jobsDescription: string;
    jobsEmpty: string;
    refreshAction: string;
    retryAction: string;
    retrying: string;
    fileNameLabel: string;
    progressLabel: string;
    resultLabel: string;
    attemptsLabel: string;
    createdAtLabel: string;
    logsLabel: string;
    statusUploaded: string;
    statusValidating: string;
    statusValidated: string;
    statusCommitting: string;
    statusCompleted: string;
    statusFailed: string;
    jobFailedMessage: string;
    logQueued: string;
    logStarted: string;
    logCompleted: string;
    logFailed: string;
    logRetried: string;
    logRecovered: string;
  };
  users: {
    title: string;
    description: string;
    searchLabel: string;
    filterRole: string;
    filterStatus: string;
    filterAll: string;
    roleUser: string;
    roleAdmin: string;
    statusActive: string;
    statusLocked: string;
    tableEmail: string;
    tableName: string;
    tableRole: string;
    tableStatus: string;
    tableLastLogin: string;
    never: string;
    lockAction: string;
    unlockAction: string;
    promoteAction: string;
    demoteAction: string;
    resetPasswordAction: string;
    resetPasswordSent: string;
    confirmLock: string;
    confirmUnlock: string;
    confirmPromote: string;
    confirmDemote: string;
    confirmResetPassword: string;
    lastAdminGuardError: string;
    actionFailed: string;
  };
  audit: {
    title: string;
    description: string;
    listHeading: string;
    tableActor: string;
    tableAction: string;
    tableEntityType: string;
    tableEntityId: string;
    tableMetadata: string;
    tableWhen: string;
    systemActor: string;
  };
}

const vi: AdminCatalog = {
  nav: {
    dashboard: "Tổng quan",
    exams: "Kỳ thi",
    topics: "Chủ đề",
    questions: "Câu hỏi",
    tests: "Đề thi",
    media: "Media",
    imports: "Nhập câu hỏi",
    users: "Người dùng",
    audit: "Nhật ký",
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
    apply: "Áp dụng",
    loadMore: "Tải thêm",
    moveUp: "Lên",
    moveDown: "Xuống",
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
    typeTrueFalse: "Đúng / Sai",
    typeMatching: "Ghép cặp",
    typeOrdering: "Sắp xếp thứ tự",
    content: "Nội dung câu hỏi",
    explanation: "Giải thích (tùy chọn)",
    options: "Lựa chọn",
    optionLabel: "Nhãn",
    optionText: "Nội dung lựa chọn",
    optionCorrect: "Đáp án đúng",
    matchTargetText: "Nội dung cần ghép",
    orderingHint:
      "Thứ tự hiển thị bên dưới chính là thứ tự đúng; dùng nút lên/xuống để điều chỉnh.",
    addOption: "Thêm lựa chọn",
    removeOption: "Bỏ lựa chọn",
    filterKeyword: "Tìm theo từ khóa",
    filterType: "Loại",
    filterStatus: "Trạng thái",
    filterAll: "Tất cả",
    version: "Phiên bản",
    mediaHeading: "Media đính kèm (tối đa 5, chỉ tệp Sẵn sàng)",
    mediaEmpty:
      "Chưa có media nào ở trạng thái Sẵn sàng. Hãy tải lên trong trang Media.",
    mediaLimitReached: "Đã chọn tối đa 5 tệp media.",
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
  media: {
    title: "Media",
    description:
      "Quản lý hình ảnh, âm thanh và video dùng cho câu hỏi. Chỉ tệp ở trạng thái Sẵn sàng mới có thể gắn vào câu hỏi.",
    uploadAction: "Tải lên tệp",
    uploading: "Đang tải lên…",
    processing: "Đang xử lý…",
    listHeading: "Danh sách media",
    fileName: "Tên tệp",
    type: "Loại",
    typeImage: "Hình ảnh",
    typeAudio: "Âm thanh",
    typeVideo: "Video",
    sizeBytes: "Kích thước",
    status: "Trạng thái",
    statusPending: "Đang chờ",
    statusReady: "Sẵn sàng",
    statusQuarantined: "Bị cách ly",
    statusDeleted: "Đã xóa",
    referencedBy: "Số câu hỏi sử dụng",
    filterType: "Loại",
    filterStatus: "Trạng thái",
    filterAll: "Tất cả",
    filterKeyword: "Tìm theo tên tệp",
    preview: "Xem trước",
    altText: "Văn bản thay thế (alt)",
    caption: "Chú thích",
    transcript: "Bản ghi lời (transcript)",
    editTranslations: "Sửa bản dịch",
    deleteBlocked: "Không thể xóa: tệp vẫn được câu hỏi sử dụng.",
    uploadFailed: "Tải lên thất bại.",
    unsupportedType: "Loại tệp này không được hỗ trợ.",
    tooLarge: "Tệp vượt quá kích thước cho phép.",
  },
  imports: {
    title: "Nhập câu hỏi",
    description:
      "Nhập câu hỏi từ tệp CSV hoặc XLSX (UTF-8). Xem trước và kiểm tra toàn bộ dữ liệu trước khi ghi; nếu có dòng lỗi, sẽ không có gì được ghi vào hệ thống.",
    selectExamLabel: "Chọn kỳ thi",
    chooseFileLabel: "Chọn tệp CSV hoặc XLSX",
    downloadTemplateAction: "Tải tệp mẫu",
    exportAction: "Xuất câu hỏi hiện có (CSV)",
    previewAction: "Xem trước",
    previewHeading: "Kết quả xem trước",
    totalRowsLabel: "Tổng số dòng",
    validRowsLabel: "Dòng hợp lệ",
    errorRowsLabel: "Dòng lỗi",
    rowNumberLabel: "Dòng",
    rowExternalIdLabel: "Mã ngoài",
    rowErrorsLabel: "Lỗi",
    errorRowNumbersLabel: "Dòng cần sửa",
    questionContentRequiredError:
      "Cần nhập nội dung câu hỏi ở ít nhất một ngôn ngữ",
    optionContentRequiredError:
      "Cần nhập nội dung đáp án ở ít nhất một ngôn ngữ",
    matchTargetRequiredError:
      "Cần nhập nội dung ghép cặp ở ít nhất một ngôn ngữ",
    confirmAction: "Xác nhận nhập",
    confirmBlockedAction: "Sửa dòng lỗi trước khi nhập",
    confirmBlockedHint:
      "Không thể nhập khi tệp còn dòng lỗi. Hãy sửa tệp và xem trước lại.",
    backAction: "Quay lại",
    committing: "Đang ghi dữ liệu…",
    commitSuccessHeading: "Nhập thành công",
    createdCountLabel: "Số câu hỏi mới",
    updatedCountLabel: "Số câu hỏi đã cập nhật",
    backToQuestions: "Về danh sách câu hỏi",
    noFileError: "Vui lòng chọn kỳ thi và một tệp.",
    fixErrorsNotice:
      "Có dòng lỗi. Hãy sửa tệp và xem trước lại; không có gì được ghi vào hệ thống.",
    previewing: "Đang xem trước…",
    startOverAction: "Nhập tệp khác",
    queuedHeading: "Đã tạo job nhập câu hỏi",
    queuedDescription:
      "Job đang chạy ngầm. Bạn có thể rời trang này và theo dõi lại trong màn nhật ký import.",
    viewJobsAction: "Theo dõi job import",
    jobsTitle: "Nhật ký job import",
    jobsDescription:
      "Theo dõi trạng thái, kết quả và log vận hành của các lần nhập câu hỏi chạy ngầm.",
    jobsEmpty: "Chưa có job import nào.",
    refreshAction: "Làm mới",
    retryAction: "Chạy lại",
    retrying: "Đang xếp hàng lại…",
    fileNameLabel: "Tệp",
    progressLabel: "Tiến độ",
    resultLabel: "Kết quả",
    attemptsLabel: "Số lần chạy",
    createdAtLabel: "Tạo lúc",
    logsLabel: "Log",
    statusUploaded: "Đã tải lên",
    statusValidating: "Đang kiểm tra",
    statusValidated: "Đang chờ",
    statusCommitting: "Đang ghi dữ liệu",
    statusCompleted: "Hoàn tất",
    statusFailed: "Thất bại",
    jobFailedMessage:
      "Job import thất bại khi ghi dữ liệu. Hãy kiểm tra log và thử chạy lại.",
    logQueued: "Job đã được kiểm tra và đưa vào hàng đợi.",
    logStarted: "Worker đã bắt đầu transaction import.",
    logCompleted: "Transaction import đã hoàn tất thành công.",
    logFailed: "Transaction import thất bại và không ghi dữ liệu một phần.",
    logRetried: "Quản trị viên đã đưa job thất bại vào hàng đợi lại.",
    logRecovered:
      "Lease worker hết hạn đã được thu hồi và job được xếp hàng lại.",
  },
  users: {
    title: "Người dùng",
    description:
      "Tìm kiếm, khóa/mở khóa, đổi quyền và gửi email đặt lại mật khẩu cho người dùng.",
    searchLabel: "Tìm theo email hoặc tên",
    filterRole: "Quyền",
    filterStatus: "Trạng thái",
    filterAll: "Tất cả",
    roleUser: "Người dùng",
    roleAdmin: "Quản trị viên",
    statusActive: "Đang hoạt động",
    statusLocked: "Đã khóa",
    tableEmail: "Email",
    tableName: "Tên hiển thị",
    tableRole: "Quyền",
    tableStatus: "Trạng thái",
    tableLastLogin: "Đăng nhập gần nhất",
    never: "Chưa từng",
    lockAction: "Khóa",
    unlockAction: "Mở khóa",
    promoteAction: "Cấp quyền quản trị",
    demoteAction: "Hạ quyền",
    resetPasswordAction: "Gửi email đặt lại mật khẩu",
    resetPasswordSent: "Đã gửi email đặt lại mật khẩu (nếu tài khoản tồn tại).",
    confirmLock: "Khóa tài khoản này? Mọi phiên đăng nhập sẽ bị thu hồi.",
    confirmUnlock: "Mở khóa tài khoản này?",
    confirmPromote: "Cấp quyền quản trị viên cho người dùng này?",
    confirmDemote:
      "Hạ quyền quản trị viên của người dùng này xuống người dùng thường?",
    confirmResetPassword: "Gửi email đặt lại mật khẩu cho người dùng này?",
    lastAdminGuardError:
      "Không thể khóa hoặc hạ quyền quản trị viên cuối cùng còn hoạt động.",
    actionFailed: "Thao tác thất bại. Vui lòng thử lại.",
  },
  audit: {
    title: "Nhật ký kiểm toán",
    description:
      "Xem lại các hành động quản trị đã được ghi lại (đã ẩn dữ liệu nhạy cảm).",
    listHeading: "Danh sách sự kiện",
    tableActor: "Người thực hiện",
    tableAction: "Hành động",
    tableEntityType: "Loại đối tượng",
    tableEntityId: "Mã đối tượng",
    tableMetadata: "Chi tiết",
    tableWhen: "Thời gian",
    systemActor: "Hệ thống",
  },
};

const en: AdminCatalog = {
  nav: {
    dashboard: "Dashboard",
    exams: "Exams",
    topics: "Topics",
    questions: "Questions",
    tests: "Tests",
    media: "Media",
    imports: "Import",
    users: "Users",
    audit: "Audit log",
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
    apply: "Apply",
    loadMore: "Load more",
    moveUp: "Up",
    moveDown: "Down",
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
    typeTrueFalse: "True / False",
    typeMatching: "Matching",
    typeOrdering: "Ordering",
    content: "Question content",
    explanation: "Explanation (optional)",
    options: "Options",
    optionLabel: "Label",
    optionText: "Option content",
    optionCorrect: "Correct answer",
    matchTargetText: "Matching target",
    orderingHint:
      "The order shown below is the correct order; use the up/down buttons to adjust it.",
    addOption: "Add option",
    removeOption: "Remove option",
    filterKeyword: "Search by keyword",
    filterType: "Type",
    filterStatus: "Status",
    filterAll: "All",
    version: "Version",
    mediaHeading: "Attached media (max 5, Ready only)",
    mediaEmpty: "No Ready media assets yet. Upload one on the Media page.",
    mediaLimitReached: "Already selected the maximum of 5 media assets.",
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
  media: {
    title: "Media",
    description:
      "Manage images, audio, and video used in questions. Only Ready assets can be attached to a question.",
    uploadAction: "Upload file",
    uploading: "Uploading…",
    processing: "Processing…",
    listHeading: "Media list",
    fileName: "File name",
    type: "Type",
    typeImage: "Image",
    typeAudio: "Audio",
    typeVideo: "Video",
    sizeBytes: "Size",
    status: "Status",
    statusPending: "Pending",
    statusReady: "Ready",
    statusQuarantined: "Quarantined",
    statusDeleted: "Deleted",
    referencedBy: "Used by questions",
    filterType: "Type",
    filterStatus: "Status",
    filterAll: "All",
    filterKeyword: "Search by file name",
    preview: "Preview",
    altText: "Alt text",
    caption: "Caption",
    transcript: "Transcript",
    editTranslations: "Edit translations",
    deleteBlocked: "Can't delete: this file is still used by a question.",
    uploadFailed: "Upload failed.",
    unsupportedType: "This file type is not supported.",
    tooLarge: "The file exceeds the allowed size.",
  },
  imports: {
    title: "Import questions",
    description:
      "Import questions from a UTF-8 CSV or XLSX file. Preview and fully validate the data before committing; if any row has an error, nothing is written.",
    selectExamLabel: "Select exam",
    chooseFileLabel: "Choose a CSV or XLSX file",
    downloadTemplateAction: "Download template",
    exportAction: "Export existing questions (CSV)",
    previewAction: "Preview",
    previewHeading: "Preview result",
    totalRowsLabel: "Total rows",
    validRowsLabel: "Valid rows",
    errorRowsLabel: "Error rows",
    rowNumberLabel: "Row",
    rowExternalIdLabel: "External ID",
    rowErrorsLabel: "Errors",
    errorRowNumbersLabel: "Rows to fix",
    questionContentRequiredError:
      "Question content is required in at least one language",
    optionContentRequiredError:
      "Option content is required in at least one language",
    matchTargetRequiredError:
      "Matching target content is required in at least one language",
    confirmAction: "Confirm import",
    confirmBlockedAction: "Fix error rows before importing",
    confirmBlockedHint:
      "The import cannot continue while the file has error rows. Fix the file and preview it again.",
    backAction: "Back",
    committing: "Committing…",
    commitSuccessHeading: "Import succeeded",
    createdCountLabel: "Questions created",
    updatedCountLabel: "Questions updated",
    backToQuestions: "Back to question list",
    noFileError: "Select an exam and a file.",
    fixErrorsNotice:
      "The file has invalid rows. Fix them and preview again; nothing was committed.",
    previewing: "Previewing…",
    startOverAction: "Import another file",
    queuedHeading: "Import job created",
    queuedDescription:
      "The job is running in the background. You can leave this page and return to the import job log later.",
    viewJobsAction: "View import jobs",
    jobsTitle: "Import job log",
    jobsDescription:
      "Track the status, result, and operational logs of background question imports.",
    jobsEmpty: "No import jobs yet.",
    refreshAction: "Refresh",
    retryAction: "Retry",
    retrying: "Queueing again…",
    fileNameLabel: "File",
    progressLabel: "Progress",
    resultLabel: "Result",
    attemptsLabel: "Attempts",
    createdAtLabel: "Created",
    logsLabel: "Logs",
    statusUploaded: "Uploaded",
    statusValidating: "Validating",
    statusValidated: "Queued",
    statusCommitting: "Committing",
    statusCompleted: "Completed",
    statusFailed: "Failed",
    jobFailedMessage:
      "The import job failed while writing data. Review the log and retry.",
    logQueued: "The validated job was added to the queue.",
    logStarted: "The worker started the import transaction.",
    logCompleted: "The import transaction completed successfully.",
    logFailed: "The import transaction failed without a partial write.",
    logRetried: "An administrator queued the failed job again.",
    logRecovered: "The expired worker lease was recovered and queued again.",
  },
  users: {
    title: "Users",
    description:
      "Search, lock/unlock, change roles, and send password reset emails to users.",
    searchLabel: "Search by email or name",
    filterRole: "Role",
    filterStatus: "Status",
    filterAll: "All",
    roleUser: "User",
    roleAdmin: "Admin",
    statusActive: "Active",
    statusLocked: "Locked",
    tableEmail: "Email",
    tableName: "Display name",
    tableRole: "Role",
    tableStatus: "Status",
    tableLastLogin: "Last login",
    never: "Never",
    lockAction: "Lock",
    unlockAction: "Unlock",
    promoteAction: "Grant admin",
    demoteAction: "Revoke admin",
    resetPasswordAction: "Send password reset email",
    resetPasswordSent: "Password reset email sent (if the account exists).",
    confirmLock: "Lock this account? All active sessions will be revoked.",
    confirmUnlock: "Unlock this account?",
    confirmPromote: "Grant this user admin access?",
    confirmDemote: "Revoke this user's admin access?",
    confirmResetPassword: "Send a password reset email to this user?",
    lastAdminGuardError:
      "Cannot lock or demote the last remaining active admin.",
    actionFailed: "The action failed. Please try again.",
  },
  audit: {
    title: "Audit log",
    description: "Review logged admin actions (sensitive data is redacted).",
    listHeading: "Event list",
    tableActor: "Actor",
    tableAction: "Action",
    tableEntityType: "Entity type",
    tableEntityId: "Entity ID",
    tableMetadata: "Details",
    tableWhen: "When",
    systemActor: "System",
  },
};

export const adminCatalogs: Record<Locale, AdminCatalog> = { vi, en };

export function getAdminMessages(locale: Locale): AdminCatalog {
  return adminCatalogs[locale];
}
