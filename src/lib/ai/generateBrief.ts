import type { AIProvider, Brief } from "@/types/brief";
import { isPlainObject, parseBriefFromModelText } from "@/lib/ai/parseBrief";
import { BRIEF_SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";

const PROVIDER_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_TOKENS = 3000;

const USER_ERROR = {
  config: "Выбранный AI-провайдер пока не настроен. Проверьте переменные окружения.",
  unavailable: "AI-сервис временно недоступен. Попробуйте ещё раз.",
  invalidResponse:
    "Не удалось обработать ответ AI. Попробуйте сформировать бриф ещё раз.",
} as const;

type BriefGenerationErrorCode = keyof typeof USER_ERROR;

type ChatProviderConfig = {
  provider: AIProvider;
  url: string;
  model: string;
  apiKey: string;
};

export class BriefGenerationError extends Error {
  readonly code: BriefGenerationErrorCode;
  readonly httpStatus: number;

  constructor(code: BriefGenerationErrorCode) {
    super(USER_ERROR[code]);
    this.name = "BriefGenerationError";
    this.code = code;
    this.httpStatus = code === "invalidResponse" ? 502 : 503;
  }
}

export async function generateBrief(
  provider: AIProvider,
  message: string,
): Promise<Brief> {
  const config = getChatProviderConfig(provider);
  const content = await requestChatCompletion(config, message);

  try {
    return parseBriefFromModelText(content);
  } catch {
    throw new BriefGenerationError("invalidResponse");
  }
}

function getChatProviderConfig(provider: AIProvider): ChatProviderConfig {
  if (provider === "openrouter") {
    const apiKey = readServerEnv("OPENROUTER_API_KEY");
    const model = readServerEnv("OPENROUTER_MODEL");

    if (!apiKey || !model) {
      throw new BriefGenerationError("config");
    }

    return {
      provider,
      url: "https://openrouter.ai/api/v1/chat/completions",
      model,
      apiKey,
    };
  }

  const apiKey = readServerEnv("OPENAI_API_KEY");
  const model = readServerEnv("OPENAI_MODEL");

  if (!apiKey || !model) {
    throw new BriefGenerationError("config");
  }

  return {
    provider,
    url: "https://api.openai.com/v1/chat/completions",
    model,
    apiKey,
  };
}

function readServerEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

async function requestChatCompletion(
  config: ChatProviderConfig,
  message: string,
): Promise<string> {
  let response: Response;

  try {
    response = await fetch(config.url, {
      method: "POST",
      headers: buildHeaders(config),
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: BRIEF_SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(message) },
        ],
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch {
    throw new BriefGenerationError("unavailable");
  }

  if (!response.ok) {
    throw new BriefGenerationError("unavailable");
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new BriefGenerationError("invalidResponse");
  }

  return readAssistantContent(payload);
}

function buildHeaders(config: ChatProviderConfig): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  if (config.provider === "openrouter") {
    headers["HTTP-Referer"] = "http://localhost:3000";
    headers["X-Title"] = "BriefMaster AI";
  }

  return headers;
}

function readAssistantContent(payload: unknown): string {
  if (!isPlainObject(payload) || payload.error) {
    throw new BriefGenerationError("invalidResponse");
  }

  const choices = payload.choices;

  if (!Array.isArray(choices) || choices.length === 0 || !isPlainObject(choices[0])) {
    throw new BriefGenerationError("invalidResponse");
  }

  const message = choices[0].message;

  if (!isPlainObject(message) || typeof message.content !== "string") {
    throw new BriefGenerationError("invalidResponse");
  }

  const content = message.content.trim();

  if (content.length === 0) {
    throw new BriefGenerationError("invalidResponse");
  }

  return content;
}
