import {
  chatbotProviderDefaults,
  ChatbotError,
  type ChatCompletionRequest,
  type ChatCompletionResult,
  type ChatbotRepository,
} from "@/domain/chatbot/chatbot";
import { hashRateLimitKey } from "@/server/auth/crypto";

const RATE_LIMIT_MAX_MESSAGES = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const REQUEST_TIMEOUT_MS = 30_000;

async function callOpenAiCompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatCompletionRequest["messages"],
): Promise<ChatCompletionResult> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new ChatbotError(
      "PROVIDER_ERROR",
      502,
      `Provider responded with status ${response.status}`,
    );
  }
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new ChatbotError("PROVIDER_ERROR", 502, "Empty provider response");
  }
  return { content };
}

async function callAnthropic(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatCompletionRequest["messages"],
): Promise<ChatCompletionResult> {
  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 1024, messages }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new ChatbotError(
      "PROVIDER_ERROR",
      502,
      `Provider responded with status ${response.status}`,
    );
  }
  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };
  const content = data.content
    ?.filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n");
  if (!content) {
    throw new ChatbotError("PROVIDER_ERROR", 502, "Empty provider response");
  }
  return { content };
}

export class ChatbotService {
  constructor(
    private readonly repository: ChatbotRepository,
    private readonly rateLimitSecret: string,
  ) {}

  async sendCompletion(
    input: ChatCompletionRequest,
    userId: string,
    now = new Date(),
  ): Promise<ChatCompletionResult> {
    const attempt = await this.repository.consumeRateLimit({
      action: "CHATBOT_COMPLETION",
      keyHash: hashRateLimitKey(
        this.rateLimitSecret,
        "CHATBOT_COMPLETION",
        userId,
      ),
      windowExpiresAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS),
      now,
    });
    if (attempt > RATE_LIMIT_MAX_MESSAGES) {
      throw new ChatbotError("RATE_LIMITED", 429, "Too many chat messages");
    }

    const defaults = chatbotProviderDefaults[input.provider];
    const model = input.model ?? defaults.defaultModel;

    try {
      if (input.provider === "anthropic") {
        return await callAnthropic(
          defaults.baseUrl,
          input.apiKey,
          model,
          input.messages,
        );
      }
      return await callOpenAiCompatible(
        defaults.baseUrl,
        input.apiKey,
        model,
        input.messages,
      );
    } catch (error) {
      if (error instanceof ChatbotError) throw error;
      throw new ChatbotError(
        "PROVIDER_ERROR",
        502,
        "Failed to reach the provider",
      );
    }
  }
}
