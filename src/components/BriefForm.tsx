import type { AIProvider } from "@/types/brief";

export const MIN_TEXT_LENGTH = 50;
export const MAX_TEXT_LENGTH = 8000;

export const EXAMPLE_CLIENT_TEXT =
  "Нужен современный сайт для компании, которая строит загородные дома в Московской области. Главная цель сайта — получать заявки на расчёт стоимости строительства. Клиенты — владельцы земельных участков и семьи, планирующие переезд за город. На сайте нужно показать услуги, готовые проекты домов, фотографии выполненных объектов, этапы работы и отзывы заказчиков. Нужны квиз для предварительного расчёта, форма обратного звонка и отправка заявок в Telegram. Предпочтительный стиль — современный минимализм, светлый фон, тёмно-синие акценты и крупные фотографии домов. У компании есть логотип и часть фотографий, но тексты для страниц ещё не подготовлены.";

type BriefFormProps = {
  text: string;
  provider: AIProvider;
  validationMessage: string;
  isLoading: boolean;
  canClear: boolean;
  onTextChange: (value: string) => void;
  onProviderChange: (provider: AIProvider) => void;
  onSubmit: () => void;
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
  onTextChange,
  onProviderChange,
  onSubmit,
  onClear,
  onFillExample,
}: BriefFormProps) {
  const characterCount = text.length;
  const isOverLimit = characterCount > MAX_TEXT_LENGTH;
  const fieldErrorId = "client-message-error";
  const fieldHintId = "client-message-hint";

  return (
    <section
      aria-labelledby="form-title"
      className="rounded-2xl border border-line bg-card p-5 shadow-[0_8px_24px_rgba(32,32,42,0.04)] sm:p-6"
    >
      <div className="mb-5">
        <h2 id="form-title" className="text-xl font-semibold tracking-tight text-ink">
          Исходные данные
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          Вставьте сообщение клиента или описание будущего сайта.
        </p>
      </div>

      <p className="mb-5 rounded-xl border border-line bg-brand-soft px-3 py-2 text-sm leading-5 text-ink">
        Демонстрационный режим: подключение AI будет добавлено на следующем
        этапе.
      </p>

      <fieldset className="mb-5 min-w-0">
        <legend id="provider-label" className="mb-2 text-sm font-medium text-ink">
          AI-провайдер
        </legend>
        <div
          role="radiogroup"
          aria-labelledby="provider-label"
          className="grid gap-3 sm:grid-cols-2"
        >
          {PROVIDERS.map((item) => {
            const selected = provider === item.value;

            return (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={isLoading}
                onClick={() => onProviderChange(item.value)}
                className={`min-h-12 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${
                  selected
                    ? "border-brand bg-brand-soft"
                    : "border-line bg-card hover:border-brand/40"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium text-ink">{item.label}</span>
                  {selected ? (
                    <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-white">
                      Выбран
                    </span>
                  ) : (
                    <span className="text-xs text-muted">Выбрать</span>
                  )}
                </span>
                <span className="mt-1 block text-xs text-muted">{item.hint}</span>
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
          placeholder="Например: Нужен современный сайт для строительной компании. Хотим показать услуги и выполненные проекты, добавить квиз и отправлять заявки в Telegram…"
          aria-invalid={validationMessage ? true : undefined}
          aria-describedby={
            validationMessage ? `${fieldHintId} ${fieldErrorId}` : fieldHintId
          }
          className={`min-h-52 w-full resize-y rounded-xl border bg-card px-3 py-3 text-sm leading-6 text-ink placeholder:text-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${
            validationMessage ? "border-danger" : "border-line"
          }`}
        />
        <div
          id={fieldHintId}
          className="mt-2 flex flex-wrap items-start justify-between gap-2 text-xs leading-5 text-muted"
        >
          <p>
            Минимальный объём — {MIN_TEXT_LENGTH} символов. Максимальный объём —{" "}
            {MAX_TEXT_LENGTH} символов.
          </p>
          <p className={isOverLimit ? "font-medium text-danger" : undefined}>
            {characterCount} / {MAX_TEXT_LENGTH}
          </p>
        </div>
        {validationMessage ? (
          <p id={fieldErrorId} role="alert" className="mt-2 text-sm text-danger">
            {validationMessage}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-brand/50 disabled:hover:bg-brand/50"
        >
          {isLoading ? "Формируем бриф…" : "Сформировать бриф"}
        </button>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onFillExample}
            disabled={isLoading}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Заполнить примером
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!canClear || isLoading}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Очистить
          </button>
        </div>
      </div>
    </section>
  );
}
