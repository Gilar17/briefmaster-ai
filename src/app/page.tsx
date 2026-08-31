"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import BriefForm, {
  EXAMPLE_CLIENT_TEXT,
  MAX_TEXT_LENGTH,
  MIN_TEXT_LENGTH,
} from "@/components/BriefForm";
import BriefResult, { formatBriefAsText } from "@/components/BriefResult";
import WorkPlanModal, {
  getTodayIsoDate,
  type PlanProgress,
} from "@/components/WorkPlanModal";
import {
  BrandMark,
  QuestionsIcon,
  SectionsIcon,
  StructureIcon,
} from "@/components/UiIcons";
import { isPlainObject, normalizeBrief } from "@/lib/ai/parseBrief";
import type {
  AIProvider,
  Brief,
  GenerateBriefErrorResponse,
  GenerateBriefSuccessResponse,
  RequestStatus,
} from "@/types/brief";

const PAGE_SHELL = "mx-auto w-full max-w-[1220px] px-4 sm:px-5";
const NETWORK_ERROR =
  "Не удалось связаться с сервером. Проверьте подключение и повторите попытку.";
const UNAVAILABLE_ERROR =
  "AI-сервис временно недоступен. Попробуйте ещё раз.";
const INVALID_RESPONSE_ERROR =
  "Не удалось обработать ответ AI. Попробуйте сформировать бриф ещё раз.";

const TOAST_DURATION_MS = 2800;

const ADVANTAGES = [
  {
    title: "Структура сайта",
    icon: StructureIcon,
    targetId: "brief-structure",
  },
  {
    title: "Что уточнить у клиента",
    icon: QuestionsIcon,
    targetId: "brief-questions",
  },
  {
    title: "Порядок работы",
    icon: SectionsIcon,
    targetId: "brief-workflow",
  },
] as const;

const ADVANTAGE_CARD_CLASS =
  "ui-focus flex h-full min-h-[92px] w-full cursor-pointer gap-3 rounded-[var(--radius-card)] border border-line bg-card p-4 text-left no-underline transition-colors hover:border-brand/35 hover:bg-page";

type ToastTone = "info" | "success" | "danger";
type ToastState = { text: string; tone: ToastTone };

function scrollToBriefSection(targetId: string) {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  document.getElementById(targetId)?.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start",
  });
}

function getValidationMessage(text: string): string {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return "Вставьте сообщение клиента или описание проекта.";
  }

  if (trimmed.length < MIN_TEXT_LENGTH) {
    return "Добавьте больше сведений, чтобы можно было собрать бриф.";
  }

  if (trimmed.length > MAX_TEXT_LENGTH) {
    return "Сократите текст. Сейчас он превышает допустимый объём.";
  }

  return "";
}

export default function Home() {
  const [text, setText] = useState("");
  const [provider, setProvider] = useState<AIProvider>("openrouter");
  const [validationMessage, setValidationMessage] = useState("");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [resultProvider, setResultProvider] = useState<AIProvider | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [apiError, setApiError] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [planProgress, setPlanProgress] = useState<PlanProgress>({});
  const abortRef = useRef<AbortController | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();

      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const isLoading = status === "loading";
  const hasBrief = status === "success" && brief !== null;
  const canClear =
    text.length > 0 ||
    brief !== null ||
    validationMessage.length > 0 ||
    copied ||
    copyError.length > 0 ||
    apiError.length > 0 ||
    provider !== "openrouter";

  function resetCopyState() {
    setCopied(false);
    setCopyError("");
  }

  function resetPlanState() {
    setPlanOpen(false);
    setPlanProgress({});
  }

  function showToast(text: string, tone: ToastTone) {
    setToast({ text, tone });

    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_DURATION_MS);
  }

  function handleAdvantageActivate(targetId: string) {
    if (!hasBrief) {
      showToast("Сначала сформируйте бриф", "info");
      return;
    }

    scrollToBriefSection(targetId);
  }

  function handlePlanToggle(index: number, completed: boolean) {
    setPlanProgress((current) => ({
      ...current,
      [index]: completed
        ? { completed: true, date: getTodayIsoDate() }
        : { completed: false, date: "" },
    }));
  }

  function handlePlanDateChange(index: number, date: string) {
    setPlanProgress((current) => {
      const item = current[index];

      if (!item?.completed) {
        return current;
      }

      return {
        ...current,
        [index]: {
          completed: true,
          date: date || getTodayIsoDate(),
        },
      };
    });
  }

  function handleTextChange(value: string) {
    setText(value);

    if (validationMessage) {
      setValidationMessage(getValidationMessage(value));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading || abortRef.current !== null) {
      return;
    }

    const nextValidationMessage = getValidationMessage(text);
    setValidationMessage(nextValidationMessage);
    resetCopyState();
    setApiError("");

    if (nextValidationMessage) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setBrief(null);
    setResultProvider(null);
    setStatus("loading");
    resetPlanState();

    try {
      const response = await fetch("/api/generate-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          text: text.trim(),
        }),
        signal: controller.signal,
      });

      let data: unknown;

      try {
        data = await response.json();
      } catch {
        setStatus("error");
        setApiError(UNAVAILABLE_ERROR);
        return;
      }

      const success = readSuccessResponse(data);

      if (success) {
        setBrief(success.brief);
        setResultProvider(success.provider);
        setStatus("success");
        return;
      }

      if (isErrorResponse(data)) {
        setStatus("error");
        setApiError(data.error);
        return;
      }

      setStatus("error");
      setApiError(INVALID_RESPONSE_ERROR);
    } catch {
      if (controller.signal.aborted) {
        return;
      }

      setStatus("error");
      setApiError(NETWORK_ERROR);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }

  function handleClear() {
    abortRef.current?.abort();
    abortRef.current = null;

    setText("");
    setProvider("openrouter");
    setValidationMessage("");
    setStatus("idle");
    setBrief(null);
    setResultProvider(null);
    setApiError("");
    resetCopyState();
    resetPlanState();
  }

  function handleFillExample() {
    setText(EXAMPLE_CLIENT_TEXT);
    setValidationMessage("");
  }

  async function handleCopy() {
    if (!brief) {
      return;
    }

    const readableBrief = formatBriefAsText(brief);

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API is not available");
      }

      await navigator.clipboard.writeText(readableBrief);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopied(false);
      setCopyError(
        "Не удалось скопировать бриф. Выделите текст и скопируйте вручную.",
      );
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-page">
      <header className="border-b border-line bg-card">
        <div className={`${PAGE_SHELL} flex items-center justify-between gap-4 py-4`}>
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark className="h-8 w-8 shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight text-ink">
                БрифМастер AI
              </p>
              <p className="truncate text-[13px] leading-5 text-muted">
                AI-помощник для дизайнеров
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-ink">
            MVP
          </span>
        </div>
      </header>

      <main className={`${PAGE_SHELL} flex flex-1 flex-col gap-7 py-6 pb-24 sm:py-8 sm:pb-28`}>
        <section className="max-w-[720px]">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-brand">
            <BrandMark className="h-5 w-5" />
            БрифМастер AI
          </p>
          <h1 className="max-w-[34rem] text-[28px] font-semibold leading-[1.2] tracking-tight text-ink sm:text-[36px] lg:text-[40px]">
            Превратите сообщение клиента в понятный бриф
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7">
            Вставьте переписку, заметки после созвона или свободное описание
            проекта — приложение структурирует требования и подготовит вопросы
            для уточнения.
          </p>
          <ul className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            {ADVANTAGES.map((item) => {
              const Icon = item.icon;
              const cardContent = (
                <>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 text-sm leading-6 text-ink">{item.title}</span>
                </>
              );

              return (
                <li key={item.title} className="min-w-0">
                  {hasBrief ? (
                    <a
                      href={`#${item.targetId}`}
                      onClick={(event) => {
                        event.preventDefault();
                        handleAdvantageActivate(item.targetId);
                      }}
                      className={ADVANTAGE_CARD_CLASS}
                    >
                      {cardContent}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        handleAdvantageActivate(item.targetId);
                      }}
                      className={ADVANTAGE_CARD_CLASS}
                    >
                      {cardContent}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 w-full lg:w-[44%]">
            <BriefForm
              text={text}
              provider={provider}
              validationMessage={validationMessage}
              isLoading={isLoading}
              canClear={canClear}
              onTextChange={handleTextChange}
              onProviderChange={setProvider}
              onSubmit={handleSubmit}
              onClear={handleClear}
              onFillExample={handleFillExample}
            />
          </div>
          <div className="min-w-0 w-full lg:w-[56%]">
            <BriefResult
              status={status}
              brief={brief}
              provider={resultProvider ?? provider}
              copied={copied}
              copyError={copyError}
              apiError={apiError}
              onCopy={handleCopy}
              onReset={handleClear}
              onNotify={(message) => {
                showToast(
                  message,
                  message === "Раздел скопирован" ? "success" : "danger",
                );
              }}
              onOpenPlan={() => {
                setPlanOpen(true);
              }}
              planOpen={planOpen}
            />
          </div>
        </div>
      </main>

      {brief ? (
        <WorkPlanModal
          open={planOpen}
          items={brief.recommendedWorkflow}
          progress={planProgress}
          onClose={() => {
            setPlanOpen(false);
          }}
          onToggle={handlePlanToggle}
          onDateChange={handlePlanDateChange}
        />
      ) : null}

      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-4 top-[4.75rem] z-50 flex justify-center"
      >
        {toast ? (
          <p
            role="status"
            className={`pointer-events-auto max-w-sm rounded-[var(--radius-control)] px-3 py-2 text-center text-sm font-medium shadow-[var(--shadow-card)] ${
              toast.tone === "success"
                ? "bg-success-soft text-success"
                : toast.tone === "danger"
                  ? "bg-danger-soft text-danger"
                  : "bg-brand-soft text-ink"
            }`}
          >
            {toast.text}
          </p>
        ) : null}
      </div>

      <footer className="mt-auto border-t border-line bg-card">
        <p className={`${PAGE_SHELL} py-4 text-sm leading-6 text-muted`}>
          БрифМастер AI — помощник для подготовки технического задания на
          разработку сайта.
        </p>
      </footer>
    </div>
  );
}

function isErrorResponse(data: unknown): data is GenerateBriefErrorResponse {
  return (
    isPlainObject(data) &&
    data.success === false &&
    typeof data.error === "string" &&
    data.error.trim().length > 0
  );
}

function readSuccessResponse(
  data: unknown,
): GenerateBriefSuccessResponse | null {
  if (!isPlainObject(data) || data.success !== true) {
    return null;
  }

  if (data.provider !== "openrouter" && data.provider !== "openai") {
    return null;
  }

  try {
    return {
      success: true,
      provider: data.provider,
      brief: normalizeBrief(data.brief),
    };
  } catch {
    return null;
  }
}
