import type { Locale } from "@/domain/common/locale";

export interface QuizCatalog {
  nav: {
    exams: string;
    history: string;
    account: string;
    backToSite: string;
  };
  common: {
    statusInProgress: string;
    statusSubmitted: string;
    statusExpired: string;
    statusAbandoned: string;
    modeStudy: string;
    modePracticeImmediate: string;
    modeExamDeferred: string;
    scopeTopic: string;
    scopeFullTest: string;
    scopeQuestionBank: string;
  };
  exams: {
    listTitle: string;
    listDescription: string;
    searchLabel: string;
    searchAction: string;
    empty: string;
    topicsCount: string;
    questionsCount: string;
    viewAction: string;
    backToList: string;
    localeFallbackNotice: string;
    testsHeading: string;
    topicQuestionsCount: string;
    testDurationMinutes: string;
    testNoTimeLimit: string;
    testPassingScore: string;
    tableTestName: string;
    tableDuration: string;
    tablePassingScore: string;
    modeLabel: string;
    modeStudyHint: string;
    modePracticeImmediateHint: string;
    modeExamDeferredHint: string;
    startAction: string;
    startWorking: string;
    startError: string;
    noTopicsError: string;
    noTestsError: string;
    topicsGridHeading: string;
    inProgressNotice: string;
    continueAttemptAction: string;
    selectAction: string;
    chooseModeHeading: string;
    selectedLabel: string;
    immediateCheckLabel: string;
    immediateCheckHint: string;
  };
  attempt: {
    loadError: string;
    questionOf: string;
    previousAction: string;
    nextAction: string;
    flagAction: string;
    unflagAction: string;
    navigatorHeading: string;
    navigatorAnsweredCount: string;
    navigatorOpenAction: string;
    jumpToUnansweredAction: string;
    filterAll: string;
    filterEmpty: string;
    jumpToQuestionLabel: string;
    jumpToQuestionAction: string;
    statusUnanswered: string;
    statusAnswered: string;
    statusFlagged: string;
    statusChecked: string;
    savingIndicator: string;
    savedIndicator: string;
    saveErrorIndicator: string;
    retryAction: string;
    checkAction: string;
    checkedCorrect: string;
    checkedIncorrect: string;
    matchingInstruction: string;
    matchingPlaceholder: string;
    correctMatchLabel: string;
    orderingInstruction: string;
    moveUpAction: string;
    moveDownAction: string;
    saveOrderAction: string;
    correctOrderLabel: string;
    timeRemainingLabel: string;
    timeUpNotice: string;
    submitAction: string;
    submitConfirmTitle: string;
    submitConfirmUnanswered: string;
    submitConfirmBody: string;
    submitConfirmConfirm: string;
    submitConfirmCancel: string;
    exitAction: string;
    abandonAction: string;
    abandonConfirmTitle: string;
    abandonConfirmBody: string;
    abandonConfirmConfirm: string;
    abandonConfirmCancel: string;
    explanationLabel: string;
    leaveWarning: string;
    mediaLoadError: string;
  };
  result: {
    title: string;
    notOfficialNotice: string;
    scoreLabel: string;
    passLabel: string;
    failLabel: string;
    correctCountLabel: string;
    incorrectCountLabel: string;
    unansweredCountLabel: string;
    durationLabel: string;
    topicBreakdownHeading: string;
    topicBreakdownTopic: string;
    topicBreakdownCorrect: string;
    topicBreakdownIncorrect: string;
    topicBreakdownUnanswered: string;
    reviewHeading: string;
    yourAnswerLabel: string;
    correctAnswerLabel: string;
    backToHistory: string;
    backToExam: string;
  };
  history: {
    title: string;
    description: string;
    filterExam: string;
    filterMode: string;
    filterStatus: string;
    filterFrom: string;
    filterTo: string;
    filterAll: string;
    filterApply: string;
    filterReset: string;
    empty: string;
    tableExam: string;
    tableMode: string;
    tableStatus: string;
    tableScore: string;
    tableStarted: string;
    tableDuration: string;
    tableActions: string;
    continueAction: string;
    viewAction: string;
    loadMore: string;
  };
  comments: {
    heading: string;
    showAction: string;
    hideAction: string;
    empty: string;
    placeholder: string;
    postAction: string;
    posting: string;
    editAction: string;
    saveAction: string;
    cancelAction: string;
    deleteAction: string;
    deleteConfirm: string;
    editedLabel: string;
    loadMoreAction: string;
    moderateAction: string;
    moderateReasonPrompt: string;
    postError: string;
    rateLimited: string;
  };
}

const vi: QuizCatalog = {
  nav: {
    exams: "Kỳ thi",
    history: "Lịch sử",
    account: "Tài khoản",
    backToSite: "Về trang chính",
  },
  common: {
    statusInProgress: "Đang làm",
    statusSubmitted: "Đã nộp",
    statusExpired: "Hết giờ",
    statusAbandoned: "Đã bỏ",
    modeStudy: "Ôn tập",
    modePracticeImmediate: "Thực hành",
    modeExamDeferred: "Thi cuối bài",
    scopeTopic: "Theo chủ đề",
    scopeFullTest: "Đề hoàn chỉnh",
    scopeQuestionBank: "Toàn bộ ngân hàng câu hỏi",
  },
  exams: {
    listTitle: "Kỳ thi",
    listDescription: "Chọn một kỳ thi đã publish để bắt đầu luyện tập.",
    searchLabel: "Tìm theo tên hoặc mã kỳ thi",
    searchAction: "Tìm kiếm",
    empty: "Chưa có kỳ thi nào được publish.",
    topicsCount: "{count} chủ đề",
    questionsCount: "{count} câu hỏi đã publish",
    viewAction: "Xem chi tiết",
    backToList: "Về danh sách kỳ thi",
    localeFallbackNotice:
      "Kỳ thi này chưa bật tiếng Anh; nội dung dưới đây hiển thị bằng ngôn ngữ chính của kỳ thi.",
    testsHeading: "Đề thi",
    topicQuestionsCount: "{count} câu đã publish",
    testDurationMinutes: "{minutes} phút",
    testNoTimeLimit: "Không giới hạn thời gian",
    testPassingScore: "Điểm đạt {percent}%",
    tableTestName: "Đề thi",
    tableDuration: "Thời gian",
    tablePassingScore: "Điểm đạt",
    modeLabel: "Chế độ làm bài",
    modeStudyHint: "Hiện đáp án và giải thích ngay khi mở câu.",
    modePracticeImmediateHint: "Tự kiểm tra đáp án trong lúc làm bài.",
    modeExamDeferredHint: "Không hiện đáp án cho đến khi nộp toàn bài.",
    startAction: "Bắt đầu",
    startWorking: "Đang khởi tạo…",
    startError: "Không thể bắt đầu. Vui lòng thử lại.",
    noTopicsError: "Kỳ thi này chưa có chủ đề nào để luyện tập.",
    noTestsError: "Kỳ thi này chưa có đề thi nào để làm.",
    topicsGridHeading: "Các chủ đề trong kỳ thi",
    inProgressNotice: "Bạn có bài làm đang dở cho kỳ thi này.",
    continueAttemptAction: "Tiếp tục làm bài",
    selectAction: "Chọn",
    chooseModeHeading: "Chọn chế độ làm bài",
    selectedLabel: "Đã chọn",
    immediateCheckLabel: "Cho phép kiểm tra đáp án ngay sau mỗi câu",
    immediateCheckHint:
      "Nếu tắt, bạn chỉ xem được đáp án sau khi nộp toàn bộ bài.",
  },
  attempt: {
    loadError: "Không thể tải bài làm. Vui lòng thử lại.",
    questionOf: "Câu {current}/{total}",
    previousAction: "Câu trước",
    nextAction: "Câu sau",
    flagAction: "Đánh dấu",
    unflagAction: "Bỏ đánh dấu",
    navigatorHeading: "Danh sách câu hỏi",
    navigatorAnsweredCount: "{answered}/{total} đã trả lời",
    navigatorOpenAction: "Danh sách câu",
    jumpToUnansweredAction: "Đến câu chưa trả lời",
    filterAll: "Tất cả",
    filterEmpty: "Không có câu nào phù hợp với bộ lọc.",
    jumpToQuestionLabel: "Đi tới câu",
    jumpToQuestionAction: "Đi",
    statusUnanswered: "Chưa trả lời",
    statusAnswered: "Đã trả lời",
    statusFlagged: "Đã đánh dấu",
    statusChecked: "Đã kiểm tra",
    savingIndicator: "Đang lưu…",
    savedIndicator: "Đã lưu.",
    saveErrorIndicator: "Lỗi lưu.",
    retryAction: "Thử lại",
    checkAction: "Kiểm tra",
    checkedCorrect: "Chính xác!",
    checkedIncorrect: "Chưa đúng.",
    matchingInstruction: "Chọn mục tương ứng cho từng nội dung.",
    matchingPlaceholder: "Chọn mục để ghép",
    correctMatchLabel: "Cặp đúng",
    orderingInstruction: "Dùng các nút để sắp xếp theo thứ tự đúng.",
    moveUpAction: "Di chuyển lên",
    moveDownAction: "Di chuyển xuống",
    saveOrderAction: "Xác nhận thứ tự hiện tại",
    correctOrderLabel: "Thứ tự đúng",
    timeRemainingLabel: "Thời gian còn lại",
    timeUpNotice: "Đã hết giờ. Bài làm đang được nộp tự động.",
    submitAction: "Nộp bài",
    submitConfirmTitle: "Xác nhận nộp bài",
    submitConfirmUnanswered: "Bạn còn {count} câu chưa trả lời.",
    submitConfirmBody: "Bạn có chắc muốn nộp bài ngay bây giờ?",
    submitConfirmConfirm: "Nộp bài",
    submitConfirmCancel: "Tiếp tục làm bài",
    exitAction: "Thoát",
    abandonAction: "Bỏ và làm lại",
    abandonConfirmTitle: "Bỏ bài làm này?",
    abandonConfirmBody:
      "Bài làm hiện tại sẽ được đóng lại và không tính điểm. Bạn có thể bắt đầu một bài mới.",
    abandonConfirmConfirm: "Bỏ bài làm",
    abandonConfirmCancel: "Ở lại",
    explanationLabel: "Giải thích",
    leaveWarning: "Bạn có thay đổi chưa lưu. Rời khỏi trang sẽ mất dữ liệu.",
    mediaLoadError: "Không thể tải media cho câu hỏi này.",
  },
  result: {
    title: "Kết quả",
    notOfficialNotice: "Đây là chế độ ôn tập, kết quả chỉ mang tính tham khảo.",
    scoreLabel: "Điểm",
    passLabel: "Đạt",
    failLabel: "Không đạt",
    correctCountLabel: "Số câu đúng",
    incorrectCountLabel: "Số câu sai",
    unansweredCountLabel: "Số câu bỏ trống",
    durationLabel: "Thời gian làm bài",
    topicBreakdownHeading: "Thống kê theo chủ đề",
    topicBreakdownTopic: "Chủ đề",
    topicBreakdownCorrect: "Đúng",
    topicBreakdownIncorrect: "Sai",
    topicBreakdownUnanswered: "Bỏ trống",
    reviewHeading: "Xem lại bài làm",
    yourAnswerLabel: "Đáp án của bạn",
    correctAnswerLabel: "Đáp án đúng",
    backToHistory: "Về lịch sử làm bài",
    backToExam: "Về trang kỳ thi",
  },
  history: {
    title: "Lịch sử làm bài",
    description: "Danh sách các lần làm bài của bạn, mới nhất trước.",
    filterExam: "Kỳ thi",
    filterMode: "Chế độ",
    filterStatus: "Trạng thái",
    filterFrom: "Từ ngày",
    filterTo: "Đến ngày",
    filterAll: "Tất cả",
    filterApply: "Lọc",
    filterReset: "Xóa lọc",
    empty: "Bạn chưa làm bài nào.",
    tableExam: "Kỳ thi",
    tableMode: "Chế độ",
    tableStatus: "Trạng thái",
    tableScore: "Điểm",
    tableStarted: "Bắt đầu",
    tableDuration: "Thời lượng",
    tableActions: "Thao tác",
    continueAction: "Tiếp tục",
    viewAction: "Xem chi tiết",
    loadMore: "Xem thêm",
  },
  comments: {
    heading: "Thảo luận",
    showAction: "Xem thảo luận",
    hideAction: "Ẩn thảo luận",
    empty: "Chưa có bình luận nào.",
    placeholder: "Viết bình luận của bạn…",
    postAction: "Gửi",
    posting: "Đang gửi…",
    editAction: "Sửa",
    saveAction: "Lưu",
    cancelAction: "Hủy",
    deleteAction: "Xóa",
    deleteConfirm: "Xóa bình luận này?",
    editedLabel: "(đã chỉnh sửa)",
    loadMoreAction: "Xem thêm bình luận",
    moderateAction: "Ẩn (kiểm duyệt)",
    moderateReasonPrompt: "Lý do ẩn bình luận này:",
    postError: "Không thể gửi bình luận. Vui lòng thử lại.",
    rateLimited: "Bạn đang bình luận quá nhanh. Vui lòng thử lại sau.",
  },
};

const en: QuizCatalog = {
  nav: {
    exams: "Exams",
    history: "History",
    account: "Account",
    backToSite: "Back to site",
  },
  common: {
    statusInProgress: "In progress",
    statusSubmitted: "Submitted",
    statusExpired: "Expired",
    statusAbandoned: "Abandoned",
    modeStudy: "Study",
    modePracticeImmediate: "Practice",
    modeExamDeferred: "Exam (deferred)",
    scopeTopic: "By topic",
    scopeFullTest: "Full test",
    scopeQuestionBank: "Entire question bank",
  },
  exams: {
    listTitle: "Exams",
    listDescription: "Pick a published exam to start practicing.",
    searchLabel: "Search by exam name or code",
    searchAction: "Search",
    empty: "No exams have been published yet.",
    topicsCount: "{count} topics",
    questionsCount: "{count} published questions",
    viewAction: "View details",
    backToList: "Back to exam list",
    localeFallbackNotice:
      "English isn't enabled for this exam yet; content below is shown in the exam's primary language.",
    testsHeading: "Tests",
    topicQuestionsCount: "{count} published questions",
    testDurationMinutes: "{minutes} minutes",
    testNoTimeLimit: "No time limit",
    testPassingScore: "Passing score {percent}%",
    tableTestName: "Test",
    tableDuration: "Duration",
    tablePassingScore: "Passing score",
    modeLabel: "Mode",
    modeStudyHint:
      "Show the answer and explanation as soon as you open a question.",
    modePracticeImmediateHint: "Check your answers while taking the attempt.",
    modeExamDeferredHint:
      "Answers stay hidden until you submit the whole attempt.",
    startAction: "Start",
    startWorking: "Starting…",
    startError: "Couldn't start this attempt. Please try again.",
    noTopicsError: "This exam has no topics to practice yet.",
    noTestsError: "This exam has no tests to take yet.",
    selectAction: "Select",
    chooseModeHeading: "Choose how to take it",
    selectedLabel: "Selected",
    immediateCheckLabel: "Allow checking the answer right after each question",
    immediateCheckHint:
      "If off, you'll only see answers after submitting the whole attempt.",
    topicsGridHeading: "Topics in this exam",
    inProgressNotice: "You have an unfinished attempt for this exam.",
    continueAttemptAction: "Continue attempt",
  },
  attempt: {
    loadError: "Couldn't load this attempt. Please try again.",
    questionOf: "Question {current} of {total}",
    previousAction: "Previous",
    nextAction: "Next",
    flagAction: "Flag",
    unflagAction: "Unflag",
    navigatorHeading: "Question navigator",
    navigatorAnsweredCount: "{answered}/{total} answered",
    navigatorOpenAction: "Question list",
    jumpToUnansweredAction: "Jump to unanswered",
    filterAll: "All",
    filterEmpty: "No questions match this filter.",
    jumpToQuestionLabel: "Go to question",
    jumpToQuestionAction: "Go",
    statusUnanswered: "Unanswered",
    statusAnswered: "Answered",
    statusFlagged: "Flagged",
    statusChecked: "Checked",
    savingIndicator: "Saving…",
    savedIndicator: "Saved.",
    saveErrorIndicator: "Save failed.",
    retryAction: "Retry",
    checkAction: "Check",
    checkedCorrect: "Correct!",
    checkedIncorrect: "Not quite.",
    matchingInstruction: "Choose the matching item for each entry.",
    matchingPlaceholder: "Choose a match",
    correctMatchLabel: "Correct match",
    orderingInstruction:
      "Use the buttons to arrange the steps in the correct order.",
    moveUpAction: "Move up",
    moveDownAction: "Move down",
    saveOrderAction: "Confirm current order",
    correctOrderLabel: "Correct order",
    timeRemainingLabel: "Time remaining",
    timeUpNotice: "Time's up. Submitting your attempt automatically.",
    submitAction: "Submit",
    submitConfirmTitle: "Confirm submission",
    submitConfirmUnanswered: "You have {count} unanswered questions.",
    submitConfirmBody: "Are you sure you want to submit now?",
    submitConfirmConfirm: "Submit",
    submitConfirmCancel: "Keep working",
    exitAction: "Exit",
    abandonAction: "Discard and restart",
    abandonConfirmTitle: "Discard this attempt?",
    abandonConfirmBody:
      "This attempt will be closed and won't be scored. You can start a new one.",
    abandonConfirmConfirm: "Discard attempt",
    abandonConfirmCancel: "Stay",
    explanationLabel: "Explanation",
    leaveWarning: "You have unsaved changes. Leaving will lose them.",
    mediaLoadError: "Couldn't load media for this question.",
  },
  result: {
    title: "Result",
    notOfficialNotice:
      "This was a study session; the result is for reference only.",
    scoreLabel: "Score",
    passLabel: "Passed",
    failLabel: "Not passed",
    correctCountLabel: "Correct answers",
    incorrectCountLabel: "Incorrect answers",
    unansweredCountLabel: "Unanswered",
    durationLabel: "Time taken",
    topicBreakdownHeading: "Topic breakdown",
    topicBreakdownTopic: "Topic",
    topicBreakdownCorrect: "Correct",
    topicBreakdownIncorrect: "Incorrect",
    topicBreakdownUnanswered: "Unanswered",
    reviewHeading: "Review your answers",
    yourAnswerLabel: "Your answer",
    correctAnswerLabel: "Correct answer",
    backToHistory: "Back to history",
    backToExam: "Back to exam",
  },
  history: {
    title: "Attempt history",
    description: "Your attempts, newest first.",
    filterExam: "Exam",
    filterMode: "Mode",
    filterStatus: "Status",
    filterFrom: "From",
    filterTo: "To",
    filterAll: "All",
    filterApply: "Filter",
    filterReset: "Clear filters",
    empty: "You haven't taken any attempts yet.",
    tableExam: "Exam",
    tableMode: "Mode",
    tableStatus: "Status",
    tableScore: "Score",
    tableStarted: "Started",
    tableDuration: "Duration",
    tableActions: "Actions",
    continueAction: "Continue",
    viewAction: "View",
    loadMore: "Load more",
  },
  comments: {
    heading: "Discussion",
    showAction: "Show discussion",
    hideAction: "Hide discussion",
    empty: "No comments yet.",
    placeholder: "Write your comment…",
    postAction: "Post",
    posting: "Posting…",
    editAction: "Edit",
    saveAction: "Save",
    cancelAction: "Cancel",
    deleteAction: "Delete",
    deleteConfirm: "Delete this comment?",
    editedLabel: "(edited)",
    loadMoreAction: "Load more comments",
    moderateAction: "Hide (moderate)",
    moderateReasonPrompt: "Reason for hiding this comment:",
    postError: "Couldn't post the comment. Please try again.",
    rateLimited: "You're commenting too fast. Please try again later.",
  },
};

export const quizCatalogs: Record<Locale, QuizCatalog> = { vi, en };

export function getQuizMessages(locale: Locale): QuizCatalog {
  return quizCatalogs[locale];
}
