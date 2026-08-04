import type { EmailService } from "@/domain/auth/auth";
import type { Locale } from "@/domain/common/locale";
import type { AuthConfig } from "@/server/config/env";

function copy(locale: Locale) {
  return locale === "vi"
    ? {
        verifySubject: "Xác minh tài khoản ShibaQuiz",
        verifyHeading: "Xác minh địa chỉ email",
        verifyBody: "Liên kết này có hiệu lực trong 24 giờ.",
        resetSubject: "Đặt lại mật khẩu ShibaQuiz",
        resetHeading: "Đặt lại mật khẩu",
        resetBody: "Liên kết này có hiệu lực trong 60 phút.",
        ignore: "Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.",
      }
    : {
        verifySubject: "Verify your ShibaQuiz account",
        verifyHeading: "Verify your email address",
        verifyBody: "This link is valid for 24 hours.",
        resetSubject: "Reset your ShibaQuiz password",
        resetHeading: "Reset your password",
        resetBody: "This link is valid for 60 minutes.",
        ignore:
          "If you did not request this action, you can ignore this email.",
      };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

export class AuthEmailService implements EmailService {
  constructor(private readonly config: AuthConfig) {}

  sendVerification(
    input: Parameters<EmailService["sendVerification"]>[0],
  ): Promise<void> {
    const messages = copy(input.locale);
    const url = new URL(`/${input.locale}/verify-email`, this.config.APP_URL);
    url.searchParams.set("token", input.token);
    return this.send({
      to: input.to,
      subject: messages.verifySubject,
      heading: messages.verifyHeading,
      displayName: input.displayName,
      body: messages.verifyBody,
      ignore: messages.ignore,
      url: url.toString(),
    });
  }

  sendPasswordReset(
    input: Parameters<EmailService["sendPasswordReset"]>[0],
  ): Promise<void> {
    const messages = copy(input.locale);
    const url = new URL(`/${input.locale}/reset-password`, this.config.APP_URL);
    url.searchParams.set("token", input.token);
    return this.send({
      to: input.to,
      subject: messages.resetSubject,
      heading: messages.resetHeading,
      displayName: input.displayName,
      body: messages.resetBody,
      ignore: messages.ignore,
      url: url.toString(),
    });
  }

  private async send(input: {
    to: string;
    subject: string;
    heading: string;
    displayName: string;
    body: string;
    ignore: string;
    url: string;
  }): Promise<void> {
    if (this.config.EMAIL_PROVIDER === "console") {
      console.info(
        `[ShibaQuiz email] ${input.subject} -> ${input.to}\n${input.url}`,
      );
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.EMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.config.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        html: `<h1>${escapeHtml(input.heading)}</h1><p>${escapeHtml(input.displayName)},</p><p>${escapeHtml(input.body)}</p><p><a href="${escapeHtml(input.url)}">${escapeHtml(input.heading)}</a></p><p>${escapeHtml(input.ignore)}</p>`,
      }),
    });
    if (!response.ok)
      throw new Error(`Email provider returned ${response.status}`);
  }
}
