"use client";

import { useEffect, useRef, useState } from "react";
import BriefForm, {
  EXAMPLE_CLIENT_TEXT,
  MAX_TEXT_LENGTH,
  MIN_TEXT_LENGTH,
} from "@/components/BriefForm";
import BriefResult, { formatBriefAsText } from "@/components/BriefResult";
import { demoBrief } from "@/data/demoBrief";
import type { AIProvider, Brief, RequestStatus } from "@/types/brief";

const DEMO_LOADING_MS = 850;

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

  function handleSubmit() {
    const nextValidationMessage = getValidationMessage(text);
    setValidationMessage(nextValidationMessage);
    resetCopyState();

    if (nextValidationMessage || isLoading) {
      return;
    }

    if (loadingTimeoutRef.current !== null) {
      window.clearTimeout(loadingTimeoutRef.current);
    }

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
    resetCopyState();
  }

  function handleFillExample() {
    setText(EXAMPLE_CLIENT_TEXT);
    setValidationMessage(getValidationMessage(EXAMPLE_CLIENT_TEXT));
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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight text-ink">
              БрифМастер AI
            </p>
            <p className="truncate text-sm text-muted">
              AI-помощник для дизайнеров
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-line bg-brand-soft px-3 py-1 text-xs font-medium text-ink">
            MVP
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        <section className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Превратите сообщение клиента в понятный бриф
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            Вставьте переписку, заметки после созвона или свободное описание
            проекта — приложение структурирует требования и подготовит вопросы
            для уточнения.
          </p>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-ink sm:grid-cols-3">
            <li className="rounded-xl border border-line bg-card px-4 py-3">
              11 разделов готового брифа
            </li>
            <li className="rounded-xl border border-line bg-card px-4 py-3">
              вопросы по недостающим данным
            </li>
            <li className="rounded-xl border border-line bg-card px-4 py-3">
              структура сайта и план работы
            </li>
          </ul>
        </section>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 w-full lg:w-[42%]">
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
          <div className="min-w-0 w-full lg:w-[58%]">
            <BriefResult
              status={status}
              brief={brief}
              provider={provider}
              copied={copied}
              copyError={copyError}
              onCopy={handleCopy}
            />
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-line bg-card">
        <p className="mx-auto max-w-6xl px-4 py-4 text-sm leading-6 text-muted sm:px-6">
          БрифМастер AI — помощник для подготовки технического задания на
          разработку сайта.
        </p>
      </footer>
    </div>
  );
}
