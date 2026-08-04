import type { Locale } from "@/domain/common/locale";

export interface AuthCatalog {
  common: {
    home: string;
    languageNavigation: string;
    connectionError: string;
    consoleEmailNotice: string;
    submit: string;
    working: string;
    passwordHint: string;
    email: string;
    password: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    passwordMismatch: string;
    displayName: string;
  };
  register: {
    title: string;
    description: string;
    action: string;
    success: string;
    successWithoutVerification: string;
    hasAccount: string;
    loginLink: string;
  };
  login: {
    title: string;
    description: string;
    action: string;
    forgotLink: string;
    resendLink: string;
    noAccount: string;
    registerLink: string;
  };
  verify: {
    title: string;
    description: string;
    action: string;
    success: string;
    resendTitle: string;
    resendDescription: string;
    resendAction: string;
    resendSuccess: string;
    disabledDescription: string;
  };
  forgot: {
    title: string;
    description: string;
    action: string;
    success: string;
    loginLink: string;
  };
  reset: {
    title: string;
    description: string;
    action: string;
    success: string;
    missingToken: string;
    loginLink: string;
  };
  account: {
    title: string;
    signedInAs: string;
    role: string;
    changeTitle: string;
    changeDescription: string;
    changeAction: string;
    changeSuccess: string;
    logout: string;
  };
}

const vi: AuthCatalog = {
  common: {
    home: "Về trang chủ",
    languageNavigation: "Chọn ngôn ngữ",
    connectionError: "Không thể kết nối. Vui lòng thử lại.",
    consoleEmailNotice:
      "Môi trường local không gửi email thật; mở data/dev.log hoặc terminal chạy app để lấy liên kết được yêu cầu.",
    submit: "Gửi",
    working: "Đang xử lý…",
    passwordHint: "Tối thiểu 10 ký tự, có ít nhất một chữ cái và một chữ số.",
    email: "Email",
    password: "Mật khẩu",
    currentPassword: "Mật khẩu hiện tại",
    newPassword: "Mật khẩu mới",
    confirmPassword: "Xác nhận mật khẩu",
    passwordMismatch: "Mật khẩu xác nhận không khớp.",
    displayName: "Tên hiển thị",
  },
  register: {
    title: "Tạo tài khoản",
    description:
      "Đăng ký để lưu tiến độ học và làm bài bằng ngôn ngữ bạn chọn.",
    action: "Tạo tài khoản",
    success:
      "Tài khoản đã được tạo. Hãy mở email để xác minh trong vòng 24 giờ.",
    successWithoutVerification:
      "Tài khoản đã được tạo và có thể đăng nhập ngay; hệ thống hiện không yêu cầu xác minh email.",
    hasAccount: "Đã có tài khoản?",
    loginLink: "Đăng nhập",
  },
  login: {
    title: "Đăng nhập",
    description: "Tiếp tục hành trình ôn luyện của bạn.",
    action: "Đăng nhập",
    forgotLink: "Quên mật khẩu?",
    resendLink: "Gửi lại email xác minh",
    noAccount: "Chưa có tài khoản?",
    registerLink: "Đăng ký",
  },
  verify: {
    title: "Xác minh email",
    description:
      "Xác nhận địa chỉ email để mở khóa chức năng làm bài và bình luận.",
    action: "Xác minh email",
    success: "Email đã được xác minh. Bạn có thể đăng nhập.",
    resendTitle: "Gửi lại email xác minh",
    resendDescription:
      "Nhập email đã đăng ký. Phản hồi luôn giống nhau để bảo vệ tài khoản.",
    resendAction: "Gửi lại email",
    resendSuccess: "Nếu tài khoản phù hợp, email xác minh mới đã được gửi.",
    disabledDescription:
      "Hệ thống hiện không yêu cầu xác minh email. Bạn có thể đăng nhập ngay.",
  },
  forgot: {
    title: "Quên mật khẩu",
    description:
      "Nhập email tài khoản để nhận liên kết đặt lại mật khẩu có hiệu lực 60 phút.",
    action: "Gửi liên kết",
    success: "Nếu tài khoản phù hợp, liên kết đặt lại mật khẩu đã được gửi.",
    loginLink: "Quay lại đăng nhập",
  },
  reset: {
    title: "Đặt lại mật khẩu",
    description: "Chọn mật khẩu mới an toàn cho tài khoản.",
    action: "Lưu mật khẩu mới",
    success:
      "Mật khẩu đã được cập nhật. Tất cả phiên đăng nhập cũ đã bị thu hồi.",
    missingToken: "Liên kết đặt lại mật khẩu không hợp lệ.",
    loginLink: "Đăng nhập",
  },
  account: {
    title: "Tài khoản của bạn",
    signedInAs: "Đang đăng nhập với",
    role: "Vai trò",
    changeTitle: "Đổi mật khẩu",
    changeDescription:
      "Sau khi đổi, các phiên khác sẽ bị đăng xuất để bảo vệ tài khoản.",
    changeAction: "Đổi mật khẩu",
    changeSuccess: "Mật khẩu đã được đổi và các phiên khác đã bị thu hồi.",
    logout: "Đăng xuất",
  },
};

const en: AuthCatalog = {
  common: {
    home: "Back to home",
    languageNavigation: "Choose language",
    connectionError: "Unable to connect. Please try again.",
    consoleEmailNotice:
      "Local development does not send real email; open data/dev.log or the app terminal to get the requested link.",
    submit: "Submit",
    working: "Working…",
    passwordHint: "At least 10 characters with one letter and one number.",
    email: "Email",
    password: "Password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    passwordMismatch: "The password confirmation does not match.",
    displayName: "Display name",
  },
  register: {
    title: "Create an account",
    description:
      "Register to save your learning and quiz progress in your chosen language.",
    action: "Create account",
    success:
      "Your account was created. Open your email and verify it within 24 hours.",
    successWithoutVerification:
      "Your account was created and is ready to sign in; email verification is currently not required.",
    hasAccount: "Already have an account?",
    loginLink: "Sign in",
  },
  login: {
    title: "Sign in",
    description: "Continue your exam-practice journey.",
    action: "Sign in",
    forgotLink: "Forgot password?",
    resendLink: "Resend verification email",
    noAccount: "New to ShibaQuiz?",
    registerLink: "Create an account",
  },
  verify: {
    title: "Verify email",
    description: "Confirm your email address to unlock quizzes and comments.",
    action: "Verify email",
    success: "Your email is verified. You can now sign in.",
    resendTitle: "Resend verification email",
    resendDescription:
      "Enter your registered email. The response stays generic to protect accounts.",
    resendAction: "Resend email",
    resendSuccess:
      "If the account is eligible, a new verification email has been sent.",
    disabledDescription:
      "Email verification is currently not required. You can sign in now.",
  },
  forgot: {
    title: "Forgot password",
    description:
      "Enter your account email for a reset link valid for 60 minutes.",
    action: "Send reset link",
    success: "If the account is eligible, a password reset link has been sent.",
    loginLink: "Back to sign in",
  },
  reset: {
    title: "Reset password",
    description: "Choose a new secure password for your account.",
    action: "Save new password",
    success:
      "Your password was updated. All previous sessions have been revoked.",
    missingToken: "This password reset link is invalid.",
    loginLink: "Sign in",
  },
  account: {
    title: "Your account",
    signedInAs: "Signed in as",
    role: "Role",
    changeTitle: "Change password",
    changeDescription:
      "Other sessions will be signed out after this change to protect your account.",
    changeAction: "Change password",
    changeSuccess: "Your password changed and other sessions were revoked.",
    logout: "Sign out",
  },
};

export const authCatalogs: Record<Locale, AuthCatalog> = { vi, en };

export function getAuthMessages(locale: Locale): AuthCatalog {
  return authCatalogs[locale];
}
