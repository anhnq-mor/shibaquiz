"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Send, Settings, X } from "lucide-react";

import { appApiRequest, AppApiRequestError } from "@/components/app/app-api";
import {
  chatbotProviderDefaults,
  chatbotProviders,
  type ChatbotProvider,
} from "@/domain/chatbot/chatbot";
import type { Locale } from "@/domain/common/locale";
import type { QuizCatalog } from "@/i18n/quiz-catalogs";

const STORAGE_KEY = "shibaquiz.chatbot.settings.v1";

interface ChatbotSettings {
  provider: ChatbotProvider;
  apiKey: string;
  model: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function loadSettings(): ChatbotSettings {
  const fallback: ChatbotSettings = {
    provider: "openai",
    apiKey: "",
    model: "",
  };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ChatbotSettings>;
    return {
      provider: chatbotProviders.includes(parsed.provider as ChatbotProvider)
        ? (parsed.provider as ChatbotProvider)
        : fallback.provider,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      model: typeof parsed.model === "string" ? parsed.model : "",
    };
  } catch {
    return fallback;
  }
}

export function ChatbotWidget({
  locale,
  messages,
}: {
  locale: Locale;
  messages: QuizCatalog;
}) {
  const t = messages.chatbot;
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ChatbotSettings | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelOptions, setModelOptions] = useState<string[] | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSettings(loadSettings());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [chat, sending]);

  if (!settings) return null;

  function saveSettings(next: ChatbotSettings) {
    setSettings(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSettingsSaved(true);
      window.setTimeout(() => setSettingsSaved(false), 2000);
    } catch {
      // localStorage unavailable; settings still apply for this session
    }
  }

  async function loadModels() {
    if (!settings || !settings.apiKey.trim() || loadingModels) return;
    setLoadingModels(true);
    setModelsError(null);
    try {
      const result = await appApiRequest<{ models: string[] }>(
        "/api/chatbot/models",
        locale,
        {
          method: "POST",
          silent: true,
          body: { provider: settings.provider, apiKey: settings.apiKey },
        },
      );
      setModelOptions(result.models);
    } catch (requestError) {
      setModelOptions(null);
      if (
        requestError instanceof AppApiRequestError &&
        requestError.body?.code === "RATE_LIMITED"
      ) {
        setModelsError(t.rateLimited);
      } else {
        setModelsError(t.modelsLoadError);
      }
    } finally {
      setLoadingModels(false);
    }
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!content || sending || !settings) return;
    if (!settings.apiKey.trim()) {
      setError(t.setupRequired);
      setShowSettings(true);
      return;
    }
    const nextChat = [...chat, { role: "user" as const, content }];
    setChat(nextChat);
    setDraft("");
    setSending(true);
    setError(null);
    try {
      const result = await appApiRequest<{ content: string }>(
        "/api/chatbot/completions",
        locale,
        {
          method: "POST",
          silent: true,
          body: {
            provider: settings.provider,
            apiKey: settings.apiKey,
            model: settings.model.trim() || undefined,
            messages: nextChat,
          },
        },
      );
      setChat([...nextChat, { role: "assistant", content: result.content }]);
    } catch (requestError) {
      if (
        requestError instanceof AppApiRequestError &&
        requestError.body?.code === "RATE_LIMITED"
      ) {
        setError(t.rateLimited);
      } else {
        setError(t.sendError);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="chatbot-widget">
      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-panel-header">
            <span>
              <Bot size={18} aria-hidden />
              {t.heading}
            </span>
            <div className="chatbot-panel-header-actions">
              <button
                type="button"
                aria-label={t.settingsAction}
                onClick={() => setShowSettings((value) => !value)}
              >
                <Settings size={16} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          </div>

          {showSettings ? (
            <div className="chatbot-settings">
              <label>
                {t.providerLabel}
                <select
                  value={settings.provider}
                  onChange={(event) => {
                    setModelOptions(null);
                    setModelsError(null);
                    saveSettings({
                      ...settings,
                      provider: event.target.value as ChatbotProvider,
                      model: "",
                    });
                  }}
                >
                  {chatbotProviders.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t.apiKeyLabel}
                <input
                  type="password"
                  value={settings.apiKey}
                  placeholder={t.apiKeyPlaceholder}
                  autoComplete="off"
                  onChange={(event) => {
                    setModelOptions(null);
                    setModelsError(null);
                    saveSettings({ ...settings, apiKey: event.target.value });
                  }}
                  onBlur={() => void loadModels()}
                />
              </label>
              <p className="chatbot-hint">{t.apiKeyHint}</p>
              <label>
                {t.modelLabel}
                {modelOptions && modelOptions.length > 0 ? (
                  <select
                    value={settings.model}
                    onChange={(event) =>
                      saveSettings({ ...settings, model: event.target.value })
                    }
                  >
                    <option value="">
                      {chatbotProviderDefaults[settings.provider].defaultModel}
                    </option>
                    {modelOptions.map((modelId) => (
                      <option key={modelId} value={modelId}>
                        {modelId}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={settings.model}
                    placeholder={t.modelPlaceholder}
                    onChange={(event) =>
                      saveSettings({ ...settings, model: event.target.value })
                    }
                  />
                )}
              </label>
              <div className="chatbot-model-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={!settings.apiKey.trim() || loadingModels}
                  onClick={() => void loadModels()}
                >
                  {loadingModels ? t.loadingModels : t.loadModelsAction}
                </button>
              </div>
              {modelsError && <p className="chatbot-error">{modelsError}</p>}
              {settingsSaved && (
                <p className="chatbot-hint">{t.settingsSavedNotice}</p>
              )}
            </div>
          ) : (
            <>
              <div className="chatbot-messages" ref={listRef}>
                {chat.length === 0 && <p className="chatbot-hint">{t.empty}</p>}
                {chat.map((message, index) => (
                  <div
                    key={index}
                    className={`chatbot-bubble chatbot-bubble-${message.role}`}
                  >
                    {message.content}
                  </div>
                ))}
                {sending && (
                  <div className="chatbot-bubble chatbot-bubble-assistant">
                    {t.sending}
                  </div>
                )}
              </div>
              {error && <p className="chatbot-error">{error}</p>}
              <form
                className="chatbot-composer"
                onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  void sendMessage();
                }}
              >
                <textarea
                  value={draft}
                  placeholder={t.placeholder}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={sending || !draft.trim()}
                >
                  <Send size={16} aria-hidden />
                  {t.sendAction}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        className="chatbot-toggle"
        aria-label={t.toggleLabel}
        onClick={() => setOpen((value) => !value)}
      >
        <Bot size={22} aria-hidden />
      </button>
    </div>
  );
}
