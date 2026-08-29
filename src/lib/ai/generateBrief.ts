import type { AIProvider, Brief } from "@/types/brief";
import { isPlainObject, parseBriefFromModelText } from "@/lib/ai/parseBrief";
import { BRIEF_SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";

const PROVIDER_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_TOKENS = 3000;

const USER_ERROR = {
  config: "Выбранный AI-провайдер пока не настроен. Проверьте переменные окружения.",
  unavailable: "AI-сервис временно недоступен. Попробуйте ещё раз.",
  billing:
    "На счёте выбранного AI-сервиса недостаточно средств. Пополните баланс и попробуйте снова.",
  region:
    "Выбранный AI-сервис недоступен в текущем регионе. Попробуйте другого провайдера.",
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
      body: JSON.stringify(buildChatCompletionBody(config, message)),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch {
    throw new BriefGenerationError("unavailable");
  }

  if (!response.ok) {
    throw await mapProviderHttpError(response);
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new BriefGenerationError("invalidResponse");
  }

  return readAssistantContent(payload);
}

function buildChatCompletionBody(
  config: ChatProviderConfig,
  message: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: "system", content: BRIEF_SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(message) },
    ],
  };

  if (config.provider === "openai") {
    body.max_completion_tokens = MAX_OUTPUT_TOKENS;
  } else {
    body.max_tokens = MAX_OUTPUT_TOKENS;
    body.temperature = 0.2;
  }

  return body;
}

async function mapProviderHttpError(response: Response): Promise<never> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new BriefGenerationError("unavailable");
  }

  const code = readProviderErrorCode(payload);
  const message = readProviderErrorMessage(payload);

  if (
    response.status === 402 ||
    code === "insufficient_quota" ||
    code === "billing_not_active" ||
    code === "billing_hard_limit_reached" ||
    code === "credit_balance_exhausted" ||
    code === "organization_spend_limit_exceeded" ||
    code === "project_spend_limit_exceeded" ||
    message.includes("quota") ||
    message.includes("billing") ||
    message.includes("credit")
  ) {
    throw new BriefGenerationError("billing");
  }

  if (
    response.status === 403 ||
    code === "unsupported_country_region_territory" ||
    message.includes("country") ||
    message.includes("territory")
  ) {
    throw new BriefGenerationError("region");
  }

  if (code === "invalid_api_key" || response.status === 401) {
    throw new BriefGenerationError("config");
  }

  throw new BriefGenerationError("unavailable");
}

function readProviderErrorCode(payload: unknown): string {
  if (!isPlainObject(payload) || !isPlainObject(payload.error)) {
    return "";
  }

  const code = payload.error.code;
  const type = payload.error.type;

  if (typeof code === "string" && code.trim()) {
    return code.trim();
  }

  if (typeof type === "string" && type.trim()) {
    return type.trim();
  }

  return "";
}

function readProviderErrorMessage(payload: unknown): string {
  if (!isPlainObject(payload) || !isPlainObject(payload.error)) {
    return "";
  }

  return typeof payload.error.message === "string"
    ? payload.error.message.toLowerCase()
    : "";
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
