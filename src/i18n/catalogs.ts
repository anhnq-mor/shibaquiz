import type { Locale } from "@/domain/common/locale";

export interface MessageCatalog {
  metadata: {
    title: string;
    description: string;
  };
  a11y: {
    skipToContent: string;
    homeLabel: string;
    languageNavigation: string;
    apiLoading: string;
  };
  navigation: {
    overview: string;
    architecture: string;
    status: string;
    login: string;
    register: string;
    exams: string;
    history: string;
    account: string;
    admin: string;
    logout: string;
    userMenu: string;
    signedInAs: string;
    switchToVietnamese: string;
    switchToEnglish: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    primaryAction: string;
    secondaryAction: string;
  };
  principles: {
    heading: string;
    description: string;
    databaseTitle: string;
    databaseBody: string;
    mediaTitle: string;
    mediaBody: string;
    privacyTitle: string;
    privacyBody: string;
  };
  status: {
    heading: string;
    description: string;
    summary: string;
    progressLabel: string;
    completeState: string;
    inProgressState: string;
    items: Array<{
      title: string;
      state: "complete" | "inProgress";
    }>;
  };
  footer: string;
}

const vi: MessageCatalog = {
  metadata: {
    title: "ShibaQuiz — Học chắc, thi tự tin",
    description: "Nền tảng ôn luyện kỳ thi song ngữ, an toàn và dễ tiếp cận.",
  },
  a11y: {
    skipToContent: "Chuyển đến nội dung chính",
    homeLabel: "Trang chủ ShibaQuiz",
    languageNavigation: "Chọn ngôn ngữ",
    apiLoading: "Đang xử lý yêu cầu…",
  },
  navigation: {
    overview: "Tổng quan",
    architecture: "Nguyên tắc",
    status: "Tiến độ",
    login: "Đăng nhập",
    register: "Đăng ký",
    exams: "Kỳ thi",
    history: "Lịch sử",
    account: "Tài khoản",
    admin: "Quản trị",
    logout: "Đăng xuất",
    userMenu: "Mở menu tài khoản",
    signedInAs: "Đang đăng nhập với",
    switchToVietnamese: "Chuyển sang Tiếng Việt",
    switchToEnglish: "Switch to English",
  },
  hero: {
    eyebrow: "Nền tảng đang được xây dựng",
    title: "Một nơi ôn luyện rõ ràng, bình tĩnh và đáng tin cậy.",
    description:
      "ShibaQuiz giữ nguyên nội dung bài làm theo ngôn ngữ bạn chọn, bảo vệ đáp án trước thời điểm công bố và hoạt động mượt mà trên mọi thiết bị.",
    primaryAction: "Xem nền tảng kỹ thuật",
    secondaryAction: "Theo dõi tiến độ",
  },
  principles: {
    heading: "Nền móng được thiết kế cho sự tin cậy",
    description:
      "Bước đầu tiên tập trung vào những quyết định khó thay đổi khi sản phẩm đã có người dùng.",
    databaseTitle: "Dữ liệu có toàn vẹn",
    databaseBody:
      "PostgreSQL, migration có phiên bản và repository interface bảo vệ mọi nghiệp vụ.",
    mediaTitle: "Media tách biệt",
    mediaBody:
      "File đi thẳng tới object storage riêng tư; ứng dụng chỉ giữ metadata và object key.",
    privacyTitle: "Đáp án đúng thời điểm",
    privacyBody:
      "DTO công khai chỉ chứa đáp án và giải thích khi chế độ làm bài cho phép.",
  },
  status: {
    heading: "Tiến độ triển khai",
    description:
      "Toàn bộ nghiệp vụ MVP đã được triển khai; giai đoạn hiện tại tập trung vào kiểm thử đầu-cuối, accessibility, observability và vận hành production.",
    summary: "9/10 bước đã hoàn tất",
    progressLabel: "Tiến độ tổng thể của ShibaQuiz",
    completeState: "Hoàn tất",
    inProgressState: "Đang thực hiện",
    items: [
      { title: "Bước 1 · Nền tảng và kiến trúc dữ liệu", state: "complete" },
      { title: "Bước 2 · Tài khoản và phân quyền an toàn", state: "complete" },
      { title: "Bước 3 · Đa ngôn ngữ và bản dịch", state: "complete" },
      { title: "Bước 4 · Quản trị nội dung kỳ thi", state: "complete" },
      { title: "Bước 5 · Vòng đời media riêng tư", state: "complete" },
      { title: "Bước 6 · Import CSV/XLSX có kiểm chứng", state: "complete" },
      { title: "Bước 7 · Khám phá và bài làm localized", state: "complete" },
      { title: "Bước 8 · Chấm điểm, kết quả và lịch sử", state: "complete" },
      { title: "Bước 9 · Bình luận, kiểm duyệt và audit", state: "complete" },
      {
        title: "Bước 10 · Hardening, accessibility và vận hành",
        state: "inProgress",
      },
    ],
  },
  footer: "ShibaQuiz · Thiết kế cho tiếng Việt và English ngay từ đầu.",
};

const en: MessageCatalog = {
  metadata: {
    title: "ShibaQuiz — Learn well, test confidently",
    description: "A secure, accessible, bilingual exam-practice platform.",
  },
  a11y: {
    skipToContent: "Skip to main content",
    homeLabel: "ShibaQuiz home",
    languageNavigation: "Choose language",
    apiLoading: "Processing your request…",
  },
  navigation: {
    overview: "Overview",
    architecture: "Principles",
    status: "Progress",
    login: "Sign in",
    register: "Register",
    exams: "Exams",
    history: "History",
    account: "Account",
    admin: "Administration",
    logout: "Sign out",
    userMenu: "Open account menu",
    signedInAs: "Signed in as",
    switchToVietnamese: "Chuyển sang Tiếng Việt",
    switchToEnglish: "Switch to English",
  },
  hero: {
    eyebrow: "Platform under construction",
    title: "A calmer, clearer, more trustworthy place to practise.",
    description:
      "ShibaQuiz preserves each attempt in the language you chose, protects answers until disclosure is allowed, and works smoothly on every device.",
    primaryAction: "Explore the foundation",
    secondaryAction: "Track progress",
  },
  principles: {
    heading: "A foundation designed for trust",
    description:
      "The first step focuses on decisions that become difficult to change after learners arrive.",
    databaseTitle: "Data with integrity",
    databaseBody:
      "PostgreSQL, versioned migrations, and repository interfaces protect every business operation.",
    mediaTitle: "Media stays separate",
    mediaBody:
      "Files go directly to private object storage; the app keeps only metadata and object keys.",
    privacyTitle: "Answers at the right time",
    privacyBody:
      "Public DTOs include correct answers and explanations only when the attempt mode allows it.",
  },
  status: {
    heading: "Delivery progress",
    description:
      "All MVP business flows are implemented; current work focuses on end-to-end verification, accessibility, observability, and production operations.",
    summary: "9 of 10 steps complete",
    progressLabel: "Overall ShibaQuiz delivery progress",
    completeState: "Complete",
    inProgressState: "In progress",
    items: [
      { title: "Step 1 · Foundation and data architecture", state: "complete" },
      {
        title: "Step 2 · Secure accounts and authorization",
        state: "complete",
      },
      { title: "Step 3 · Locales and translations", state: "complete" },
      { title: "Step 4 · Exam content administration", state: "complete" },
      { title: "Step 5 · Private media lifecycle", state: "complete" },
      { title: "Step 6 · Validated CSV/XLSX import", state: "complete" },
      { title: "Step 7 · Discovery and localized attempts", state: "complete" },
      { title: "Step 8 · Scoring, results, and history", state: "complete" },
      { title: "Step 9 · Comments, moderation, and audit", state: "complete" },
      {
        title: "Step 10 · Hardening, accessibility, and operations",
        state: "inProgress",
      },
    ],
  },
  footer: "ShibaQuiz · Designed for Tiếng Việt and English from day one.",
};

export const catalogs: Record<Locale, MessageCatalog> = { vi, en };

export function getMessages(locale: Locale): MessageCatalog {
  return catalogs[locale];
}
