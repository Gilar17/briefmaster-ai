"use client";

import type { FormEvent } from "react";
import {
  MAX_MESSAGE_LENGTH,
  MIN_MESSAGE_LENGTH,
  type AIProvider,
} from "@/types/brief";
import { AlertIcon, InfoIcon } from "@/components/UiIcons";

export const MIN_TEXT_LENGTH = MIN_MESSAGE_LENGTH;
export const MAX_TEXT_LENGTH = MAX_MESSAGE_LENGTH;
export const BRIEF_SOURCE_DATA_ID = "brief-source-data";

export const EXAMPLE_CLIENT_TEXT =
  "Нужен современный сайт для компании, которая строит загородные дома в Московской области. Главная цель сайта — получать заявки на расчёт стоимости строительства. Клиенты — владельцы земельных участков и семьи, планирующие переезд за город. На сайте нужно показать услуги, готовые проекты домов, фотографии выполненных объектов, этапы работы и отзывы заказчиков. Нужны квиз для предварительного расчёта, форма обратного звонка и отправка заявок в Telegram. Предпочтительный стиль — современный минимализм, светлый фон, тёмно-синие акценты и крупные фотографии домов. У компании есть логотип и часть фотографий, но тексты для страниц ещё не подготовлены.";

type BriefFormProps = {
  text: string;
  provider: AIProvider;
  validationMessage: string;
  isLoading: boolean;
  canClear: boolean;
  showHints?: boolean;
  onTextChange: (value: string) => void;
  onProviderChange: (provider: AIProvider) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
  onFillExample: () => void;
};

const PROVIDERS: { value: AIProvider; label: string; hint: string }[] = [
  {
    value: "openrouter",
    label: "OpenRouter",
    hint: "Основной провайдер",
  },
  {
    value: "openai",
    label: "OpenAI",
    hint: "Альтернативный провайдер",
  },
];

export default function BriefForm({
  text,
  provider,
  validationMessage,
  isLoading,
  canClear,
  showHints = true,
  onTextChange,
  onProviderChange,
  onSubmit,
  onClear,
  onFillExample,
}: BriefFormProps) {
  const characterCount = text.length;
  const isOverLimit = characterCount > MAX_MESSAGE_LENGTH;
  const fieldErrorId = "client-message-error";
  const fieldHintId = "client-message-hint";

  return (
    <form
      id={BRIEF_SOURCE_DATA_ID}
      noValidate
      aria-labelledby="form-title"
      className="ui-card scroll-mt-4 p-5 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSubmit(event);
      }}
    >
      <div className="mb-5">
        <h2 id="form-title" className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
          Исходные данные
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-muted">
          Вставьте сообщение клиента или описание будущего сайта.
        </p>
      </div>

      {showHints ? (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-control)] bg-brand-soft px-3 py-2">
          <InfoIcon className="h-4 w-4 shrink-0 text-brand" />
          <p className="text-sm leading-5 text-ink">Выберите AI-провайдера</p>
        </div>
      ) : null}

      <fieldset className="mb-5 min-w-0">
        <legend id="provider-label" className="mb-2.5 text-sm font-medium text-ink">
          AI-провайдер
        </legend>
        <div
          role="group"
          aria-labelledby="provider-label"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {PROVIDERS.map((item) => {
            const selected = provider === item.value;

            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={selected}
                disabled={isLoading}
                onClick={(event) => {
                  event.preventDefault();
                  onProviderChange(item.value);
                }}
                className={`ui-focus flex min-h-12 w-full items-start gap-3 rounded-[var(--radius-control)] border px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                  selected
                    ? "border-brand bg-brand-soft"
                    : "border-line bg-card hover:border-brand/35 hover:bg-page"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    selected ? "border-brand" : "border-line"
                  }`}
                  aria-hidden="true"
                >
                  {selected ? (
                    <span className="h-2 w-2 rounded-full bg-brand" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">{item.label}</span>
                    {selected ? (
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium leading-4 text-brand-foreground">
                        Выбран
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-[13px] leading-5 text-muted">
                    {item.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mb-5">
        <label
          htmlFor="client-message"
          className="mb-2 block text-sm font-medium text-ink"
        >
          Сообщение клиента
        </label>
        <textarea
          id="client-message"
          name="client-message"
          value={text}
          disabled={isLoading}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Например: Нужен современный сайт для строительной компании. Хотим показать услуги и проекты, добавить квиз и получать заявки в Telegram…"
          aria-invalid={validationMessage ? true : undefined}
          aria-describedby={
            validationMessage ? `${fieldHintId} ${fieldErrorId}` : fieldHintId
          }
          className={`ui-focus min-h-[180px] w-full resize-y rounded-[var(--radius-control)] border bg-card px-3.5 py-3 text-sm leading-6 text-ink placeholder:text-muted md:min-h-[240px] disabled:cursor-not-allowed disabled:opacity-70 ${
            validationMessage ? "border-danger" : "border-line"
          }`}
        />
        <div
          id={fieldHintId}
          className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px] leading-5 text-muted"
        >
          <p>От {MIN_MESSAGE_LENGTH} до {MAX_MESSAGE_LENGTH} символов</p>
          <p className={isOverLimit ? "font-medium text-danger" : undefined}>
            {characterCount} / {MAX_MESSAGE_LENGTH}
          </p>
        </div>
        {validationMessage ? (
          <div
            id={fieldErrorId}
            role="alert"
            className="mt-2 flex gap-2 rounded-[var(--radius-control)] bg-danger-soft px-3 py-2.5 text-sm leading-5 text-danger"
          >
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{validationMessage}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="ui-focus inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-brand px-4 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover active:bg-brand-active disabled:cursor-not-allowed disabled:bg-brand/50 disabled:hover:bg-brand/50 disabled:active:bg-brand/50"
        >
          {isLoading ? (
            <>
              <span className="brief-spinner-sm" aria-hidden="true" />
              Формируем бриф…
            </>
          ) : (
            "Сформировать бриф"
          )}
        </button>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onFillExample();
            }}
            disabled={isLoading}
            className="ui-focus inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-60"
          >
            Заполнить примером
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onClear();
            }}
            disabled={!canClear || isLoading}
            className="ui-focus inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
          >
            Очистить
          </button>
        </div>
      </div>
    </form>
  );
}
