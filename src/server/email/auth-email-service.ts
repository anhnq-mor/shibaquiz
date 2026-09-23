import { AuthEmailService as BaseAuthEmailService } from "@shibaquiz/admin-platform/email/auth-email-service";
import type { AuthConfig } from "@/server/config/env";

export class AuthEmailService extends BaseAuthEmailService {
  constructor(config: AuthConfig) {
    super(config, "ShibaQuiz");
  }
}
