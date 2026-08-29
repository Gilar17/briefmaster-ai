import type { AIProvider, Brief } from "@/types/brief";
import { isPlainObject, parseBriefFromModelText } from "@/lib/ai/parseBrief";
import { BRIEF_SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";

const PROVIDER_TIMEOUT_MS = 45_000;
const MAX_OUTPUT_TOKENS = 3000;

type BriefGenerationErrorCode =
  | "config"
  | "unavailable"
  | "billing"
  | "region"
  | "timeout"
  | "invalidResponse";

const OPENROUTER_USER_ERROR: Record<BriefGenerationErrorCode, string> = {
  config: "Выбранный AI-провайдер пока не настроен. Проверьте переменные окружения.",
  unavailable: "AI-сервис временно недоступен. Попробуйте ещё раз.",
  billing:
    "На счёте выбранного AI-сервиса недостаточно средств. Пополните баланс и попробуйте снова.",
  region:
    "Выбранный AI-сервис недоступен в текущем регионе. Попробуйте другого провайдера.",
  timeout: "AI-сервис временно недоступен. Попробуйте ещё раз.",
  invalidResponse:
    "Не удалось обработать ответ AI. Попробуйте сформировать бриф ещё раз.",
};

const OPENAI_USER_ERROR: Record<BriefGenerationErrorCode, string> = {
  config:
    "OpenAI сейчас недоступен: сервер не настроен. Попробуйте позже или выберите OpenRouter.",
  unavailable:
    "OpenAI сейчас не смог сформировать бриф. Попробуйте позже или выберите OpenRouter.",
  billing:
    "На счёте OpenAI недостаточно средств. Пополните баланс и попробуйте снова.",
  region:
    "OpenAI недоступен в текущем регионе. Попробуйте позже или выберите OpenRouter.",
  timeout: "OpenAI не ответил вовремя. Попробуйте ещё раз.",
  invalidResponse:
    "Не удалось прочитать бриф от OpenAI. Попробуйте отправить запрос ещё раз.",
};

function getUserError(
  provider: AIProvider,
  code: BriefGenerationErrorCode,
): string {
  return provider === "openai"
    ? OPENAI_USER_ERROR[code]
    : OPENROUTER_USER_ERROR[code];
}

type ChatProviderConfig = {
  provider: AIProvider;
  url: string;
  model: string;
  apiKey: string;
};

export class BriefGenerationError extends Error {
  readonly code: BriefGenerationErrorCode;
  readonly httpStatus: number;
  readonly provider: AIProvider;
  diagnostic: {
    provider: AIProvider;
    httpStatus: number;
    errorType: string;
    errorCode: string;
    errorMessage: string;
    modelId: string;
  } | null;

  constructor(code: BriefGenerationErrorCode, provider: AIProvider) {
    super(getUserError(provider, code));
    this.name = "BriefGenerationError";
    this.code = code;
    this.provider = provider;
    this.diagnostic = null;
    this.httpStatus =
      code === "invalidResponse" ? 502 : code === "timeout" ? 504 : 503;
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
    throw new BriefGenerationError("invalidResponse", provider);
  }
}

function getChatProviderConfig(provider: AIProvider): ChatProviderConfig {
  if (provider === "openrouter") {
    const apiKey = readServerEnv("OPENROUTER_API_KEY");
    const model = readServerEnv("OPENROUTER_MODEL");

    if (!apiKey || !model) {
      throw new BriefGenerationError("config", provider);
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
    throw new BriefGenerationError("config", provider);
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
  } catch (error) {
    if (config.provider === "openai" && isTimeoutError(error)) {
      throw new BriefGenerationError("timeout", config.provider);
    }

    throw new BriefGenerationError("unavailable", config.provider);
  }

  if (!response.ok) {
    throw await mapProviderHttpError(response, config.provider, config.model);
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new BriefGenerationError("invalidResponse", config.provider);
  }

  return readAssistantContent(payload, config.provider);
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

async function mapProviderHttpError(
  response: Response,
  provider: AIProvider,
  modelId: string,
): Promise<never> {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw withProviderDiagnostic(
      "unavailable",
      provider,
      logSafeProviderError({
        provider,
        httpStatus: response.status,
        errorType: "",
        errorCode: "",
        errorMessage: "",
        modelId,
      }),
    );
  }

  const details = readProviderErrorDetails(payload);
  const diagnostic = logSafeProviderError({
    provider,
    httpStatus: response.status,
    errorType: details.type,
    errorCode: details.code,
    errorMessage: details.message,
    modelId,
  });

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
    throw withProviderDiagnostic("billing", provider, diagnostic);
  }

  if (isUnsupportedRegionError(code, message)) {
    throw withProviderDiagnostic("region", provider, diagnostic);
  }

  if (code === "invalid_api_key" || response.status === 401) {
    throw withProviderDiagnostic("config", provider, diagnostic);
  }

  throw withProviderDiagnostic("unavailable", provider, diagnostic);
}

function withProviderDiagnostic(
  code: BriefGenerationErrorCode,
  provider: AIProvider,
  diagnostic: BriefGenerationError["diagnostic"],
): BriefGenerationError {
  const error = new BriefGenerationError(code, provider);
  error.diagnostic = diagnostic;
  return error;
}

function readProviderErrorDetails(payload: unknown): {
  type: string;
  code: string;
  message: string;
} {
  if (!isPlainObject(payload) || !isPlainObject(payload.error)) {
    return { type: "", code: "", message: "" };
  }

  return {
    type: typeof payload.error.type === "string" ? payload.error.type.trim() : "",
    code: typeof payload.error.code === "string" ? payload.error.code.trim() : "",
    message:
      typeof payload.error.message === "string" ? payload.error.message.trim() : "",
  };
}

function sanitizeDiagnosticMessage(message: string): string {
  const redacted = message.replace(/sk-[a-zA-Z0-9_-]+/gi, "[redacted]");
  return redacted.length <= 180 ? redacted : redacted.slice(0, 180);
}

function logSafeProviderError(params: {
  provider: AIProvider;
  httpStatus: number;
  errorType: string;
  errorCode: string;
  errorMessage: string;
  modelId: string;
}): {
  provider: AIProvider;
  httpStatus: number;
  errorType: string;
  errorCode: string;
  errorMessage: string;
  modelId: string;
} {
  const diagnostic = {
    provider: params.provider,
    httpStatus: params.httpStatus,
    errorType: params.errorType,
    errorCode: params.errorCode,
    errorMessage: sanitizeDiagnosticMessage(params.errorMessage),
    modelId: params.modelId,
  };

  if (params.provider === "openai") {
    console.error("[ai-provider-error]", diagnostic);
  }

  return diagnostic;
}

function isUnsupportedRegionError(code: string, message: string): boolean {
  if (code === "unsupported_country_region_territory") {
    return true;
  }

  return (
    message.includes("country, region, or territory not supported") ||
    message.includes("unsupported country") ||
    message.includes("unsupported region") ||
    message.includes("unsupported territory") ||
    message.includes("territory not supported")
  );
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

function readAssistantContent(payload: unknown, provider: AIProvider): string {
  if (!isPlainObject(payload) || payload.error) {
    throw new BriefGenerationError("invalidResponse", provider);
  }

  const choices = payload.choices;

  if (!Array.isArray(choices) || choices.length === 0 || !isPlainObject(choices[0])) {
    throw new BriefGenerationError("invalidResponse", provider);
  }

  const message = choices[0].message;

  if (!isPlainObject(message) || typeof message.content !== "string") {
    throw new BriefGenerationError("invalidResponse", provider);
  }

  const content = message.content.trim();

  if (content.length === 0) {
    throw new BriefGenerationError("invalidResponse", provider);
  }

  return content;
}

function isTimeoutError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}
