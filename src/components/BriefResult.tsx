import type { AIProvider, Brief, RequestStatus } from "@/types/brief";
import { AlertIcon, DocumentIcon } from "@/components/UiIcons";

type BriefSection = {
  title: string;
  content: string | string[];
  highlight?: boolean;
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
};

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
    { title: "Предлагаемая структура сайта", content: brief.siteStructure },
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
    },
    { title: "Рекомендуемый порядок работы", content: brief.recommendedWorkflow },
  ];
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
}: BriefResultProps) {
  if (status === "loading") {
    return (
      <section
        aria-live="polite"
        aria-busy="true"
        className="ui-card flex min-h-[22rem] flex-col items-center justify-center p-6 text-center lg:min-h-[28rem]"
      >
        <span className="brief-spinner" aria-hidden="true" />
        <p className="mt-4 text-base font-medium text-ink">Формируем бриф…</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
          Демонстрационный режим: сейчас показывается локальный пример, без
          обращения к AI-провайдеру.
        </p>
      </section>
    );
  }

  if (status === "error" || apiError) {
    return (
      <section
        aria-labelledby="result-error-title"
        className="ui-card min-h-[22rem] p-5 sm:p-6 lg:min-h-[28rem]"
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
        aria-labelledby="result-title"
        className="ui-card p-5 sm:p-6"
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 id="result-title" className="text-lg font-semibold tracking-tight text-ink sm:text-xl">
              Готовый бриф
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Выбран в форме: {getProviderLabel(provider)}. Демонстрационный
              результат.
            </p>
          </div>
          <p className="w-fit rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-ink">
            Демонстрационный результат
          </p>
        </div>

        <div className="space-y-3">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className={`rounded-[var(--radius-control)] border border-line p-4 ${
                section.highlight ? "bg-brand-soft" : "bg-page"
              }`}
            >
              <h3 className="text-sm font-semibold leading-6 text-ink">
                <span className="mr-1.5 text-brand">{index + 1}.</span>
                {section.title}
              </h3>
              {Array.isArray(section.content) ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink">
                  {section.content.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm leading-6 text-ink">{section.content}</p>
              )}
            </article>
          ))}
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onCopy}
              className="ui-focus inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-control)] bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active sm:w-auto"
            >
              Скопировать бриф
            </button>
            <button
              type="button"
              onClick={onReset}
              className="ui-focus inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-control)] border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:bg-page sm:w-auto"
            >
              Создать новый бриф
            </button>
          </div>
          {copied ? (
            <p
              role="status"
              className="mt-3 w-fit rounded-[var(--radius-control)] bg-success-soft px-3 py-2 text-sm font-medium text-success"
            >
              Бриф скопирован
            </p>
          ) : null}
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
      aria-labelledby="result-placeholder-title"
      className="flex min-h-[22rem] flex-col rounded-[var(--radius-card)] border border-dashed border-line bg-card p-6 lg:min-h-[28rem]"
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
