"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import BriefForm, {
  BRIEF_SOURCE_DATA_ID,
  EXAMPLE_CLIENT_TEXT,
  MAX_TEXT_LENGTH,
  MIN_TEXT_LENGTH,
} from "@/components/BriefForm";
import BriefResult, { formatBriefAsText } from "@/components/BriefResult";
import ConfirmModal from "@/components/ConfirmModal";
import SettingsModal from "@/components/SettingsModal";
import WorkPlanModal, {
  getPlanItem,
  getTodayIsoDate,
  type PlanProgress,
} from "@/components/WorkPlanModal";
import { useUiSettings } from "@/lib/ui-settings";
import {
  AlertIcon,
  BrandMark,
  QuestionsIcon,
  SectionsIcon,
  SettingsIcon,
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

const CLEAR_CONFIRM_MESSAGE = "Очистить текущие данные?";
const NEW_BRIEF_CONFIRM_MESSAGE = "Перейти к новому брифу?";
const BRIEF_HINT_DURATION_MS = 3000;
const COPY_FEEDBACK_MS = 2800;
const MOBILE_AUTO_SCROLL_MAX_WIDTH_PX = 768;
const MOBILE_AUTO_SCROLL_DELAY_MS = 4000;
const MOBILE_AUTO_SCROLL_MIN_DELTA_PX = 8;

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
  const [providerOverride, setProviderOverride] = useState<AIProvider | null>(
    null,
  );
  const [validationMessage, setValidationMessage] = useState("");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [brief, setBrief] = useState<Brief | null>(null);
  const [resultProvider, setResultProvider] = useState<AIProvider | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [apiError, setApiError] = useState("");
  const [briefHintVisible, setBriefHintVisible] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"clear" | "new-brief" | null>(
    null,
  );
  const [planProgress, setPlanProgress] = useState<PlanProgress>({});
  const { settings, updateSettings, resetSettings } = useUiSettings();
  const abortRef = useRef<AbortController | null>(null);
  const briefHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasBriefRef = useRef(false);
  const provider = providerOverride ?? settings.defaultProvider;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();

      if (briefHintTimerRef.current !== null) {
        clearTimeout(briefHintTimerRef.current);
      }

      if (copiedTimerRef.current !== null) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const isLoading = status === "loading";
  const hasBrief = status === "success" && brief !== null;

  useEffect(() => {
    hasBriefRef.current = hasBrief;
  }, [hasBrief]);

  useEffect(() => {
    if (!settings.mobileAutoScroll) {
      return;
    }

    if (window.innerWidth >= MOBILE_AUTO_SCROLL_MAX_WIDTH_PX) {
      return;
    }

    const listenerController = new AbortController();
    const { signal } = listenerController;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const initialScrollY = window.scrollY;

    const cancelAutoScroll = () => {
      cancelled = true;

      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const onUserIntent = () => {
      cancelAutoScroll();
    };

    const onScroll = () => {
      if (
        Math.abs(window.scrollY - initialScrollY) < MOBILE_AUTO_SCROLL_MIN_DELTA_PX
      ) {
        return;
      }

      onUserIntent();
    };

    window.addEventListener("wheel", onUserIntent, { passive: true, signal });
    window.addEventListener("touchmove", onUserIntent, { passive: true, signal });
    window.addEventListener("touchstart", onUserIntent, { passive: true, signal });
    window.addEventListener("scroll", onScroll, { passive: true, signal });
    window.addEventListener("pointerdown", onUserIntent, { passive: true, signal });
    window.addEventListener("keydown", onUserIntent, { signal });
    document.addEventListener("focusin", onUserIntent, { signal });

    timer = setTimeout(() => {
      if (cancelled || hasBriefRef.current) {
        return;
      }

      if (window.innerWidth >= MOBILE_AUTO_SCROLL_MAX_WIDTH_PX) {
        return;
      }

      cancelled = true;

      const target = document.getElementById(BRIEF_SOURCE_DATA_ID);
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      target?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }, MOBILE_AUTO_SCROLL_DELAY_MS);

    return () => {
      cancelAutoScroll();
      listenerController.abort();
    };
  }, [settings.mobileAutoScroll]);

  const canClear =
    text.length > 0 ||
    brief !== null ||
    validationMessage.length > 0 ||
    copied ||
    copyError.length > 0 ||
    apiError.length > 0 ||
    provider !== settings.defaultProvider;

  function clearCopiedTimer() {
    if (copiedTimerRef.current !== null) {
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = null;
    }
  }

  function clearBriefHintTimer() {
    if (briefHintTimerRef.current !== null) {
      clearTimeout(briefHintTimerRef.current);
      briefHintTimerRef.current = null;
    }
  }

  function resetCopyState() {
    clearCopiedTimer();
    setCopied(false);
    setCopyError("");
  }

  function hideBriefHint() {
    clearBriefHintTimer();
    setBriefHintVisible(false);
  }

  function resetPlanState() {
    setPlanOpen(false);
    setPlanProgress({});
  }

  function showBriefHint() {
    if (!settings.uiHints) {
      return;
    }
    setBriefHintVisible(true);
    clearBriefHintTimer();
    briefHintTimerRef.current = setTimeout(() => {
      setBriefHintVisible(false);
      briefHintTimerRef.current = null;
    }, BRIEF_HINT_DURATION_MS);
  }

  function handleAdvantageActivate(targetId: string) {
    if (!hasBrief) {
      showBriefHint();
      return;
    }

    hideBriefHint();
    scrollToBriefSection(targetId);
  }

  function handlePlanToggle(index: number, completed: boolean) {
    setPlanProgress((current) => {
      const item = getPlanItem(current, index);

      return {
        ...current,
        [index]: completed
          ? {
              ...item,
              completed: true,
              completedDate: getTodayIsoDate(),
            }
          : {
              ...item,
              completed: false,
              completedDate: "",
            },
      };
    });
  }

  function handlePlanPlannedDateChange(index: number, date: string) {
    setPlanProgress((current) => {
      const item = getPlanItem(current, index);

      return {
        ...current,
        [index]: {
          ...item,
          plannedDate: date,
        },
      };
    });
  }

  function handlePlanCompletedDateChange(index: number, date: string) {
    setPlanProgress((current) => {
      const item = getPlanItem(current, index);

      if (!item.completed) {
        return current;
      }

      return {
        ...current,
        [index]: {
          ...item,
          completedDate: date,
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
    hideBriefHint();
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
    setProviderOverride(null);
    setValidationMessage("");
    setStatus("idle");
    setBrief(null);
    setResultProvider(null);
    setApiError("");
    resetCopyState();
    hideBriefHint();
    resetPlanState();
  }

  function requestClear() {
    if (settings.confirmBeforeClear) {
      setConfirmKind("clear");
      return;
    }

    handleClear();
  }

  function requestNewBrief() {
    if (settings.confirmBeforeClear) {
      setConfirmKind("new-brief");
      return;
    }

    handleClear();
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
      clearCopiedTimer();
      copiedTimerRef.current = setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, COPY_FEEDBACK_MS);
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
        <div className={`${PAGE_SHELL} flex items-center justify-between gap-3 py-4`}>
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
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
          <button
            type="button"
            id="open-settings"
            aria-label="Настройки"
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            aria-controls="settings-dialog"
            onClick={() => {
              setSettingsOpen(true);
            }}
            className="ui-focus inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-muted transition-colors hover:bg-page hover:text-ink focus-visible:text-ink active:bg-brand-soft active:text-brand"
          >
            <SettingsIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className={`${PAGE_SHELL} flex flex-1 flex-col gap-7 py-6 pb-24 sm:py-8 sm:pb-28`}>
        <section className="max-w-[720px]">
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
          {!hasBrief && briefHintVisible && settings.uiHints ? (
            <div
              role="status"
              className="mt-3 flex gap-2 rounded-[var(--radius-control)] bg-danger-soft px-3 py-2.5 text-sm leading-5 text-danger"
            >
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Сначала сформируйте бриф</p>
            </div>
          ) : null}
        </section>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 w-full lg:w-[44%]">
            <BriefForm
              text={text}
              provider={provider}
              validationMessage={validationMessage}
              isLoading={isLoading}
              canClear={canClear}
              showHints={settings.uiHints}
              onTextChange={handleTextChange}
              onProviderChange={setProviderOverride}
              onSubmit={handleSubmit}
              onClear={requestClear}
              onFillExample={handleFillExample}
            />
          </div>
          <div className="min-w-0 w-full lg:w-[56%]">
            <BriefResult
              key={status}
              status={status}
              brief={brief}
              provider={resultProvider ?? provider}
              copied={copied}
              copyError={copyError}
              apiError={apiError}
              onCopy={handleCopy}
              onReset={requestNewBrief}
              onOpenPlan={() => {
                setPlanOpen(true);
              }}
              planOpen={planOpen}
            />
          </div>
        </div>
      </main>

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onClose={() => {
          setSettingsOpen(false);
        }}
        onSettingsChange={updateSettings}
        onResetSettings={() => {
          resetSettings();
          setProviderOverride(null);
        }}
      />

      <ConfirmModal
        open={confirmKind !== null}
        message={
          confirmKind === "new-brief"
            ? NEW_BRIEF_CONFIRM_MESSAGE
            : CLEAR_CONFIRM_MESSAGE
        }
        cancelLabel="Отмена"
        confirmLabel={confirmKind === "new-brief" ? "Перейти" : "Очистить"}
        onCancel={() => {
          setConfirmKind(null);
        }}
        onConfirm={() => {
          setConfirmKind(null);
          handleClear();
        }}
      />

      {brief ? (
        <WorkPlanModal
          open={planOpen}
          items={brief.recommendedWorkflow}
          progress={planProgress}
          onClose={() => {
            setPlanOpen(false);
          }}
          onToggle={handlePlanToggle}
          onPlannedDateChange={handlePlanPlannedDateChange}
          onCompletedDateChange={handlePlanCompletedDateChange}
        />
      ) : null}

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
