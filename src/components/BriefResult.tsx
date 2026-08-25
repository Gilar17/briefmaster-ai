import type { AIProvider, Brief, RequestStatus } from "@/types/brief";

type BriefSection = {
  title: string;
  content: string | string[];
};

type BriefResultProps = {
  status: RequestStatus;
  brief: Brief | null;
  provider: AIProvider;
  copied: boolean;
  copyError: string;
  onCopy: () => void;
};

const PLACEHOLDER_ITEMS = [
  "цель и аудитория",
  "структура сайта",
  "функции и интеграции",
  "материалы от клиента",
  "вопросы для уточнения",
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
    { title: "Вопросы для уточнения", content: brief.clarificationQuestions },
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
  onCopy,
}: BriefResultProps) {
  if (status === "loading") {
    return (
      <section
        aria-live="polite"
        aria-busy="true"
        className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-line bg-card p-6 text-center shadow-[0_8px_24px_rgba(32,32,42,0.04)]"
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

  if (status === "success" && brief) {
    const sections = getBriefSections(brief);

    return (
      <section
        aria-labelledby="result-title"
        className="rounded-2xl border border-line bg-card p-5 shadow-[0_8px_24px_rgba(32,32,42,0.04)] sm:p-6"
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 id="result-title" className="text-xl font-semibold tracking-tight text-ink">
              Готовый бриф
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Выбран в форме: {getProviderLabel(provider)}. Демонстрационный
              результат.
            </p>
          </div>
          <p className="w-fit rounded-full border border-line bg-brand-soft px-3 py-1 text-xs font-medium text-ink">
            Демонстрационный результат
          </p>
        </div>

        <div className="space-y-4">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className="rounded-xl border border-line bg-page/80 p-4"
            >
              <h3 className="text-sm font-semibold leading-6 text-ink">
                {index + 1}. {section.title}
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
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:w-auto"
          >
            Скопировать результат
          </button>
          {copied ? (
            <p role="status" className="mt-3 text-sm font-medium text-success">
              Бриф скопирован
            </p>
          ) : null}
          {copyError ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {copyError}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="result-placeholder-title"
      className="rounded-2xl border border-dashed border-line bg-card p-6 shadow-[0_8px_24px_rgba(32,32,42,0.04)]"
    >
      <h2
        id="result-placeholder-title"
        className="text-xl font-semibold tracking-tight text-ink"
      >
        Здесь появится готовый бриф
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
        Добавьте информацию о проекте и нажмите «Сформировать бриф». Результат
        будет разделён на 11 понятных разделов.
      </p>
      <ul className="mt-5 space-y-2 text-sm leading-6 text-ink">
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
