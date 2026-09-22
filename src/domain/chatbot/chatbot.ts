import { z } from "zod";

export const chatbotProviders = [
  "openai",
  "anthropic",
  "google",
  "deepseek",
  "meta",
  "openrouter",
  "groq",
] as const;
export type ChatbotProvider = (typeof chatbotProviders)[number];

export const chatbotProviderDefaults: Record<
  ChatbotProvider,
  { baseUrl: string; defaultModel: string }
> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-haiku-20241022",
  },
  google: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
  },
  meta: {
    baseUrl: "https://api.llama.com/compat/v1",
    defaultModel: "Llama-3.3-70B-Instruct",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
  },
};

export const chatbotProviderLabels: Record<ChatbotProvider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  google: "Google (Gemini)",
  deepseek: "DeepSeek",
  meta: "Meta (Llama API)",
  openrouter: "OpenRouter",
  groq: "Groq",
};

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(8000),
});

export const chatCompletionRequestSchema = z.object({
  provider: z.enum(chatbotProviders),
  apiKey: z.string().trim().min(1).max(500),
  model: z.string().trim().min(1).max(200).optional(),
  messages: z.array(messageSchema).min(1).max(40),
});
export type ChatCompletionRequest = z.infer<typeof chatCompletionRequestSchema>;

export const listModelsRequestSchema = z.object({
  provider: z.enum(chatbotProviders),
  apiKey: z.string().trim().min(1).max(500),
});
export type ListModelsRequest = z.infer<typeof listModelsRequestSchema>;

export interface ChatCompletionResult {
  content: string;
}

export interface ListModelsResult {
  models: string[];
}

export class ChatbotError extends Error {
  constructor(
    public readonly code:
      "AUTH_REQUIRED" | "RATE_LIMITED" | "PROVIDER_ERROR" | "BAD_REQUEST",
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ChatbotError";
  }
}

export function isChatbotError(error: unknown): error is ChatbotError {
  return (
    error instanceof Error &&
    error.name === "ChatbotError" &&
    typeof (error as ChatbotError).code === "string"
  );
}

export interface ChatbotRepository {
  consumeRateLimit(input: {
    keyHash: string;
    action: string;
    windowExpiresAt: Date;
    now: Date;
  }): Promise<number>;
}
