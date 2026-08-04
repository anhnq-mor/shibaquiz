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
  };
  navigation: {
    overview: string;
    architecture: string;
    status: string;
    login: string;
    register: string;
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
    foundation: string;
    foundationState: string;
    next: string;
    nextState: string;
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
  },
  navigation: {
    overview: "Tổng quan",
    architecture: "Nguyên tắc",
    status: "Tiến độ",
    login: "Đăng nhập",
    register: "Đăng ký",
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
      "Mỗi lát cắt đi cùng migration, kiểm thử và tài liệu quyết định.",
    foundation: "Bước 1 · Nền tảng",
    foundationState: "Hoàn tất",
    next: "Bước 2 · Tài khoản an toàn",
    nextState: "Hoàn tất",
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
  },
  navigation: {
    overview: "Overview",
    architecture: "Principles",
    status: "Progress",
    login: "Sign in",
    register: "Register",
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
      "Every vertical slice includes its migration, tests, and decision record.",
    foundation: "Step 1 · Foundation",
    foundationState: "Complete",
    next: "Step 2 · Secure accounts",
    nextState: "Complete",
  },
  footer: "ShibaQuiz · Designed for Tiếng Việt and English from day one.",
};

export const catalogs: Record<Locale, MessageCatalog> = { vi, en };

export function getMessages(locale: Locale): MessageCatalog {
  return catalogs[locale];
}
