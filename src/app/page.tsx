"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import BriefForm, {
  EXAMPLE_CLIENT_TEXT,
  MAX_TEXT_LENGTH,
  MIN_TEXT_LENGTH,
} from "@/components/BriefForm";
import BriefResult, { formatBriefAsText } from "@/components/BriefResult";
import {
  BrandMark,
  QuestionsIcon,
  SectionsIcon,
  StructureIcon,
} from "@/components/UiIcons";
import { demoBrief } from "@/data/demoBrief";
import type { AIProvider, Brief, RequestStatus } from "@/types/brief";

const DEMO_LOADING_MS = 800;
const PAGE_SHELL = "mx-auto w-full max-w-[1220px] px-4 sm:px-5";

const ADVANTAGES = [
  {
    title: "11 разделов готового брифа",
    icon: SectionsIcon,
  },
  {
    title: "Вопросы по недостающим данным",
    icon: QuestionsIcon,
  },
  {
    title: "Структура сайта и план работ",
    icon: StructureIcon,
  },
] as const;

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
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [apiError, setApiError] = useState("");
  const loadingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current !== null) {
        window.clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const isLoading = status === "loading";
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

  function handleTextChange(value: string) {
    setText(value);

    if (validationMessage) {
      setValidationMessage(getValidationMessage(value));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading || loadingTimeoutRef.current !== null) {
      return;
    }

    const nextValidationMessage = getValidationMessage(text);
    setValidationMessage(nextValidationMessage);
    resetCopyState();
    setApiError("");

    if (nextValidationMessage) {
      return;
    }

    setBrief(null);
    setStatus("loading");
    loadingTimeoutRef.current = window.setTimeout(() => {
      setBrief(demoBrief);
      setStatus("success");
      loadingTimeoutRef.current = null;
    }, DEMO_LOADING_MS);
  }

  function handleClear() {
    if (loadingTimeoutRef.current !== null) {
      window.clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    setText("");
    setProvider("openrouter");
    setValidationMessage("");
    setStatus("idle");
    setBrief(null);
    setApiError("");
    resetCopyState();
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

      <main className={`${PAGE_SHELL} flex flex-1 flex-col gap-7 py-6 sm:py-8`}>
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

              return (
                <li
                  key={item.title}
                  className="flex h-full min-h-[92px] gap-3 rounded-[var(--radius-card)] border border-line bg-card p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm leading-6 text-ink">{item.title}</span>
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
              provider={provider}
              copied={copied}
              copyError={copyError}
              apiError={apiError}
              onCopy={handleCopy}
              onReset={handleClear}
            />
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-line bg-card">
        <p className={`${PAGE_SHELL} py-4 text-sm leading-6 text-muted`}>
          БрифМастер AI — помощник для подготовки технического задания на
          разработку сайта.
        </p>
      </footer>
    </div>
  );
}
