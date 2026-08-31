"use client";

import { useEffect, useRef, useState } from "react";
import type { AIProvider, Brief, RequestStatus } from "@/types/brief";
import { AlertIcon, DocumentIcon } from "@/components/UiIcons";

type BriefSection = {
  title: string;
  content: string | string[];
  highlight?: boolean;
  id?: string;
  copyable?: boolean;
  showPlanButton?: boolean;
};

type BriefResultProps = {
  status: RequestStatus;
  brief: Brief | null;
  provider: AIProvider;
  copied: boolean;
  copyError: string;
  apiError: string;
  onCopy: () => void;
  onReset: () => void;
  onOpenPlan: () => void;
  planOpen: boolean;
};

const COPY_FEEDBACK_MS = 2800;

const SECTION_ACTION_CLASS =
  "ui-focus inline-flex min-h-9 min-w-[7.75rem] shrink-0 items-center justify-center whitespace-nowrap rounded-[var(--radius-control)] border px-3 text-xs font-medium transition-colors";

const SECTION_ACTION_IDLE_CLASS = `${SECTION_ACTION_CLASS} border-line bg-card text-ink hover:bg-page`;

const SECTION_ACTION_SUCCESS_CLASS = `${SECTION_ACTION_CLASS} border-success bg-success text-white`;

const PLACEHOLDER_ITEMS = [
  "Цель и аудитория",
  "Структура сайта",
  "Функции и интеграции",
  "Материалы от клиента",
  "Вопросы для уточнения",
  "Порядок работы",
];

function getProviderLabel(provider: AIProvider): string {
  return provider === "openrouter" ? "OpenRouter" : "OpenAI";
}

function getBriefSections(brief: Brief): BriefSection[] {
  return [
    { title: "Общая информация о проекте", content: brief.projectOverview },
    { title: "Цель сайта", content: brief.siteGoal },
    { title: "Целевая аудитория", content: brief.targetAudience },
    { title: "Тип сайта", content: brief.siteType },
    {
      title: "Предлагаемая структура сайта",
      content: brief.siteStructure,
      id: "brief-structure",
      copyable: true,
    },
    { title: "Функциональные требования", content: brief.functionalRequirements },
    { title: "Пожелания по дизайну", content: brief.designPreferences },
    { title: "Необходимые интеграции", content: brief.integrations },
    {
      title: "Материалы, которые должен предоставить клиент",
      content: brief.requiredMaterials,
    },
    {
      title: "Вопросы для уточнения",
      content: brief.clarificationQuestions,
      highlight: true,
      id: "brief-questions",
      copyable: true,
    },
    {
      title: "Рекомендуемый порядок работы",
      content: brief.recommendedWorkflow,
      id: "brief-workflow",
      copyable: true,
      showPlanButton: true,
    },
  ];
}

export function formatSectionAsText(
  title: string,
  content: string | string[],
): string {
  const body = Array.isArray(content) ? content.join("\n") : content;
  return `${title}\n\n${body}`;
}

export function formatBriefAsText(brief: Brief): string {
  return getBriefSections(brief)
    .map((section, index) => {
      const heading = `${index + 1}. ${section.title}`;
      const body = Array.isArray(section.content)
        ? section.content.map((item) => `— ${item}`).join("\n")
        : section.content;

      return `${heading}\n${body}`;
    })
    .join("\n\n");
}

export default function BriefResult({
  status,
  brief,
  provider,
  copied,
  copyError,
  apiError,
  onCopy,
  onReset,
  onOpenPlan,
  planOpen,
}: BriefResultProps) {
  const [copiedSectionIds, setCopiedSectionIds] = useState<Record<string, boolean>>(
    {},
  );
  const sectionTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  useEffect(() => {
    const timers = sectionTimersRef.current;

    return () => {
      Object.values(timers).forEach((timer) => {
        clearTimeout(timer);
      });
    };
  }, []);

  function markSectionCopied(sectionId: string) {
    const timers = sectionTimersRef.current;

    if (timers[sectionId]) {
      clearTimeout(timers[sectionId]);
    }

    setCopiedSectionIds((current) => ({
      ...current,
      [sectionId]: true,
    }));

    timers[sectionId] = setTimeout(() => {
      setCopiedSectionIds((current) => {
        const next = { ...current };
        delete next[sectionId];
        return next;
      });
      delete timers[sectionId];
    }, COPY_FEEDBACK_MS);
  }

  async function copySection(
    sectionId: string,
    title: string,
    content: string | string[],
  ) {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API is not available");
      }

      await navigator.clipboard.writeText(formatSectionAsText(title, content));
      markSectionCopied(sectionId);
    } catch {
      setCopiedSectionIds((current) => {
        const next = { ...current };
        delete next[sectionId];
        return next;
      });
    }
  }

  if (status === "loading") {
    return (
      <section
        id="brief-result"
        aria-live="polite"
        aria-busy="true"
        className="ui-card flex min-h-[22rem] scroll-mt-6 flex-col items-center justify-center p-6 text-center lg:min-h-[28rem]"
      >
        <span className="brief-spinner" aria-hidden="true" />
        <p className="mt-4 text-base font-medium text-ink">Формируем бриф…</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
          Анализируем сообщение клиента и собираем 11 разделов брифа.
        </p>
      </section>
    );
  }

  if (status === "error" || apiError) {
    return (
      <section
        id="brief-result"
        aria-labelledby="result-error-title"
        className="ui-card min-h-[22rem] scroll-mt-6 p-5 sm:p-6 lg:min-h-[28rem]"
      >
        <div
          role="alert"
          className="flex gap-3 rounded-[var(--radius-control)] bg-danger-soft px-3.5 py-3"
        >
          <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div>
            <h2 id="result-error-title" className="text-sm font-semibold text-ink">
              Не удалось сформировать бриф
            </h2>
            <p className="mt-1 text-sm leading-6 text-danger">
              {apiError ||
                "Сервис временно недоступен. Исходный текст сохранён, попробуйте ещё раз."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (status === "success" && brief) {
    const sections = getBriefSections(brief);

    return (
      <section
        id="brief-result"
        aria-labelledby="result-title"
        className="ui-card scroll-mt-6 p-5 sm:p-6"
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 id="result-title" className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
              Готовый бриф
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Сформировано через {getProviderLabel(provider)}.
            </p>
          </div>
          <p className="w-fit rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-ink">
            Сформировано с помощью AI
          </p>
        </div>

        <div className="space-y-3">
          {sections.map((section, index) => {
            const sectionId = section.id;
            const sectionCopied = Boolean(
              sectionId && copiedSectionIds[sectionId],
            );

            return (
            <article
              id={sectionId}
              key={section.title}
              className={`min-w-0 scroll-mt-8 break-words rounded-[var(--radius-control)] border border-line p-4 ${
                section.highlight ? "bg-brand-soft" : "bg-page"
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="min-w-0 text-sm font-semibold leading-6 text-ink">
                  <span className="mr-1.5 text-brand">{index + 1}.</span>
                  {section.title}
                </h3>
                {section.copyable || section.showPlanButton ? (
                  <div className="flex flex-wrap gap-2">
                    {section.copyable && sectionId ? (
                      <button
                        type="button"
                        aria-live="polite"
                        onClick={(event) => {
                          event.preventDefault();
                          void copySection(
                            sectionId,
                            section.title,
                            section.content,
                          );
                        }}
                        className={
                          sectionCopied
                            ? SECTION_ACTION_SUCCESS_CLASS
                            : SECTION_ACTION_IDLE_CLASS
                        }
                      >
                        {sectionCopied ? "✓ Скопирован" : "Скопировать"}
                      </button>
                    ) : null}
                    {section.showPlanButton ? (
                      <button
                        type="button"
                        id="open-work-plan"
                        aria-haspopup="dialog"
                        aria-expanded={planOpen}
                        aria-controls="work-plan-dialog"
                        onClick={(event) => {
                          event.preventDefault();
                          onOpenPlan();
                        }}
                        className={SECTION_ACTION_IDLE_CLASS}
                      >
                        Открыть план
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {Array.isArray(section.content) ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 break-words text-ink">
                  {section.content.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm leading-6 break-words text-ink">
                  {section.content}
                </p>
              )}
            </article>
            );
          })}
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              aria-live="polite"
              onClick={(event) => {
                event.preventDefault();
                onCopy();
              }}
              className={`ui-focus inline-flex min-h-12 w-full min-w-0 items-center justify-center rounded-[var(--radius-control)] px-4 text-sm font-medium text-white transition-colors sm:w-auto sm:min-w-[13.25rem] ${
                copied
                  ? "bg-success"
                  : "bg-brand hover:bg-brand-hover active:bg-brand-active"
              }`}
            >
              {copied ? "✓ Бриф скопирован" : "Скопировать бриф"}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                onReset();
              }}
              className="ui-focus inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-control)] border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:bg-page sm:w-auto"
            >
              Создать новый бриф
            </button>
          </div>
          {copyError ? (
            <div
              role="alert"
              className="mt-3 flex gap-2 rounded-[var(--radius-control)] bg-danger-soft px-3 py-2.5 text-sm leading-5 text-danger"
            >
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{copyError}</p>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      id="brief-result"
      aria-labelledby="result-placeholder-title"
      className="flex min-h-[22rem] scroll-mt-6 flex-col rounded-[var(--radius-card)] border border-dashed border-line bg-card p-6 lg:min-h-[28rem]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] bg-brand-soft text-brand">
        <DocumentIcon className="h-6 w-6" />
      </div>
      <h2
        id="result-placeholder-title"
        className="mt-4 text-lg font-semibold tracking-tight text-ink sm:text-xl"
      >
        Здесь появится готовый бриф
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
        Добавьте информацию о проекте и нажмите „Сформировать бриф“. Результат
        будет разделён на 11 понятных разделов.
      </p>
      <ul className="mt-5 grid grid-cols-1 gap-2 text-sm leading-6 text-ink sm:grid-cols-2">
        {PLACEHOLDER_ITEMS.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
