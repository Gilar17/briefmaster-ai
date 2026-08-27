import {
  BriefGenerationError,
  generateBrief,
} from "@/lib/ai/generateBrief";
import { isPlainObject } from "@/lib/ai/parseBrief";
import {
  MAX_MESSAGE_LENGTH,
  MIN_MESSAGE_LENGTH,
  type AIProvider,
  type GenerateBriefErrorResponse,
  type GenerateBriefRequest,
  type GenerateBriefSuccessResponse,
} from "@/types/brief";

export const runtime = "nodejs";
export const maxDuration = 60;

const INVALID_REQUEST_ERROR =
  "Некорректный запрос. Проверьте данные и попробуйте ещё раз.";
const UNKNOWN_PROVIDER_ERROR = "Выберите OpenRouter или OpenAI.";
const EMPTY_MESSAGE_ERROR = "Вставьте сообщение клиента или описание проекта.";
const SHORT_MESSAGE_ERROR =
  "Добавьте больше сведений, чтобы можно было собрать бриф.";
const LONG_MESSAGE_ERROR =
  "Сократите текст. Сейчас он превышает допустимый объём.";
const UNAVAILABLE_ERROR =
  "AI-сервис временно недоступен. Попробуйте ещё раз.";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(INVALID_REQUEST_ERROR, 400);
  }

  const parsed = parseGenerateBriefRequest(body);

  if (!parsed.ok) {
    return errorResponse(parsed.error, 400);
  }

  try {
    const brief = await generateBrief(parsed.value.provider, parsed.value.message);

    const payload: GenerateBriefSuccessResponse = {
      success: true,
      brief,
      provider: parsed.value.provider,
    };

    return Response.json(payload);
  } catch (error) {
    if (error instanceof BriefGenerationError) {
      return errorResponse(error.message, error.httpStatus);
    }

    return errorResponse(UNAVAILABLE_ERROR, 503);
  }
}

function parseGenerateBriefRequest(
  body: unknown,
): { ok: true; value: GenerateBriefRequest } | { ok: false; error: string } {
  if (!isPlainObject(body)) {
    return { ok: false, error: INVALID_REQUEST_ERROR };
  }

  const record = body;

  if (!isAIProvider(record.provider)) {
    return {
      ok: false,
      error:
        typeof record.provider === "string"
          ? UNKNOWN_PROVIDER_ERROR
          : INVALID_REQUEST_ERROR,
    };
  }

  if (typeof record.message !== "string") {
    return { ok: false, error: INVALID_REQUEST_ERROR };
  }

  const message = record.message.trim();

  if (message.length === 0) {
    return { ok: false, error: EMPTY_MESSAGE_ERROR };
  }

  if (message.length < MIN_MESSAGE_LENGTH) {
    return { ok: false, error: SHORT_MESSAGE_ERROR };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: LONG_MESSAGE_ERROR };
  }

  return {
    ok: true,
    value: {
      provider: record.provider,
      message,
    },
  };
}

function isAIProvider(value: unknown): value is AIProvider {
  return value === "openrouter" || value === "openai";
}

function errorResponse(error: string, status: number): Response {
  const payload: GenerateBriefErrorResponse = {
    success: false,
    error,
  };

  return Response.json(payload, { status });
}
