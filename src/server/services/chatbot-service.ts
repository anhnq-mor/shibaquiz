import {
  chatbotProviderDefaults,
  ChatbotError,
  type ChatCompletionRequest,
  type ChatCompletionResult,
  type ChatbotRepository,
  type ChatbotProvider,
  type ListModelsResult,
} from "@/domain/chatbot/chatbot";
import { hashRateLimitKey } from "@/server/auth/crypto";

const RATE_LIMIT_MAX_MESSAGES = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_MODEL_LOOKUPS = 10;
const REQUEST_TIMEOUT_MS = 30_000;
const MODELS_REQUEST_TIMEOUT_MS = 15_000;

async function extractErrorDetail(response: Response): Promise<string> {
  try {
    const data = (await response.clone().json()) as {
      error?: { message?: string } | string;
      message?: string;
    };
    const providerMessage =
      typeof data.error === "string"
        ? data.error
        : (data.error?.message ?? data.message);
    return providerMessage
      ? `${response.status}: ${providerMessage}`
      : `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

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
      "Provider request failed",
      await extractErrorDetail(response),
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
      "Provider request failed",
      await extractErrorDetail(response),
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

async function fetchModelIds(
  baseUrl: string,
  apiKey: string,
  provider: ChatbotProvider,
): Promise<string[]> {
  const headers: Record<string, string> =
    provider === "anthropic"
      ? { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
      : { Authorization: `Bearer ${apiKey}` };
  const response = await fetch(`${baseUrl}/models`, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(MODELS_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new ChatbotError(
      "PROVIDER_ERROR",
      502,
      "Provider request failed",
      await extractErrorDetail(response),
    );
  }
  const data = (await response.json()) as { data?: { id?: string }[] };
  const ids = (data.data ?? [])
    .map((entry) => entry.id)
    .filter((id): id is string => Boolean(id));
  return ids.sort((a, b) => a.localeCompare(b));
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
        error instanceof Error ? error.message : undefined,
      );
    }
  }

  async listModels(
    provider: ChatbotProvider,
    apiKey: string,
    userId: string,
    now = new Date(),
  ): Promise<ListModelsResult> {
    const attempt = await this.repository.consumeRateLimit({
      action: "CHATBOT_LIST_MODELS",
      keyHash: hashRateLimitKey(
        this.rateLimitSecret,
        "CHATBOT_LIST_MODELS",
        userId,
      ),
      windowExpiresAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS),
      now,
    });
    if (attempt > RATE_LIMIT_MAX_MODEL_LOOKUPS) {
      throw new ChatbotError("RATE_LIMITED", 429, "Too many model lookups");
    }

    const defaults = chatbotProviderDefaults[provider];
    try {
      const models = await fetchModelIds(defaults.baseUrl, apiKey, provider);
      return { models };
    } catch (error) {
      if (error instanceof ChatbotError) throw error;
      throw new ChatbotError(
        "PROVIDER_ERROR",
        502,
        "Failed to reach the provider",
        error instanceof Error ? error.message : undefined,
      );
    }
  }
}
