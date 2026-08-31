"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/UiIcons";

export type PlanItemProgress = {
  completed: boolean;
  date: string;
};

export type PlanProgress = Record<number, PlanItemProgress>;

type WorkPlanModalProps = {
  open: boolean;
  items: string[];
  progress: PlanProgress;
  onClose: () => void;
  onToggle: (index: number, completed: boolean) => void;
  onDateChange: (index: number, date: string) => void;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateRu(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);

  if (!match) {
    return isoDate;
  }

  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function getWorkflowItemParts(item: string): {
  title: string;
  description: string;
} {
  const normalized = item.replace(/\r\n/g, "\n").trim();
  const withoutNumber = normalized.replace(/^\d+[.)]\s+/, "");
  const [firstLine, ...rest] = withoutNumber.split("\n");
  const title = (firstLine ?? "").trim();
  const description = rest.join("\n").trim();

  return {
    title: title || normalized,
    description,
  };
}

export function formatPlanAsText(
  items: string[],
  progress: PlanProgress,
): string {
  const blocks = items.map((item, index) => {
    const { title, description } = getWorkflowItemParts(item);
    const state = progress[index];
    const heading = `${state?.completed ? "✓" : "□"} ${index + 1}. ${title}`;
    const lines = [heading];

    if (description) {
      lines.push(description);
    }

    if (state?.completed && state.date) {
      lines.push(`Выполнено: ${formatDateRu(state.date)}`);
    }

    return lines.join("\n");
  });

  return ["План работ", ...blocks].join("\n\n");
}

export default function WorkPlanModal({
  open,
  items,
  progress,
  onClose,
  onToggle,
  onDateChange,
}: WorkPlanModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open) {
      openerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      if (!dialog.open) {
        dialog.showModal();
      }

      document.body.style.overflow = "hidden";
      return;
    }

    if (dialog.open) {
      dialog.close();
    }

    document.body.style.overflow = "";
  }, [open]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";

      if (copiedTimerRef.current !== null) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  function clearCopiedTimer() {
    if (copiedTimerRef.current !== null) {
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = null;
    }
  }

  function handleClose() {
    clearCopiedTimer();
    setCopied(false);
    setCopyError("");
    onClose();

    window.requestAnimationFrame(() => {
      const opener =
        openerRef.current ?? document.getElementById("open-work-plan");
      opener?.focus();
    });
  }

  async function handleCopyPlan() {
    const readablePlan = formatPlanAsText(items, progress);

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API is not available");
      }

      await navigator.clipboard.writeText(readablePlan);
      setCopied(true);
      setCopyError("");
      clearCopiedTimer();
      copiedTimerRef.current = setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, 2800);
    } catch {
      setCopied(false);
      setCopyError("Не удалось скопировать план.");
    }
  }

  return (
    <dialog
      ref={dialogRef}
      id="work-plan-dialog"
      aria-labelledby="work-plan-title"
      className="work-plan-dialog"
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      onClose={() => {
        if (open) {
          handleClose();
        }
      }}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h2
          id="work-plan-title"
          className="text-lg font-semibold tracking-tight text-ink"
        >
          План работ
        </h2>
        <button
          type="button"
          aria-label="Закрыть"
          onClick={handleClose}
          className="ui-focus -mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-muted transition-colors hover:bg-page hover:text-ink"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
        <ol className="space-y-3">
          {items.map((item, index) => {
            const { title, description } = getWorkflowItemParts(item);
            const state = progress[index];
            const completed = Boolean(state?.completed);
            const checkboxId = `work-plan-item-${index}`;
            const dateId = `work-plan-date-${index}`;

            return (
              <li key={`${index}-${title}`}>
                <article
                  className={`rounded-[var(--radius-control)] border p-3 sm:p-3.5 ${
                    completed
                      ? "border-brand bg-brand-soft"
                      : "border-line bg-page"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={completed}
                      onChange={(event) => {
                        onToggle(index, event.target.checked);
                      }}
                      className="ui-focus mt-1 h-4 w-4 shrink-0 accent-[var(--brand)]"
                    />
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={checkboxId}
                        className={`block text-sm font-semibold leading-6 ${
                          completed ? "text-brand" : "text-ink"
                        }`}
                      >
                        {index + 1}. {title}
                      </label>
                      {description ? (
                        <p className="mt-1 text-sm leading-6 break-words text-ink">
                          {description}
                        </p>
                      ) : null}
                      {completed ? (
                        <div className="mt-2.5 flex min-w-0 flex-col gap-1.5">
                          <p className="text-sm font-medium text-brand">
                            Выполнено
                            {state?.date ? `: ${formatDateRu(state.date)}` : ""}
                          </p>
                          <label htmlFor={dateId} className="sr-only">
                            Дата выполнения пункта {index + 1}
                          </label>
                          <input
                            id={dateId}
                            type="date"
                            value={state?.date ?? ""}
                            onChange={(event) => {
                              onDateChange(index, event.target.value);
                            }}
                            className="ui-focus min-h-9 w-full max-w-[12.5rem] rounded-[var(--radius-control)] border border-brand/40 bg-card px-2.5 text-sm text-ink"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>

      <footer className="shrink-0 border-t border-line px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            aria-live="polite"
            onClick={handleCopyPlan}
            className={`ui-focus inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-[var(--radius-control)] px-4 text-sm font-medium transition-colors sm:w-auto sm:min-w-[12.5rem] ${
              copied
                ? "border border-success bg-success text-white"
                : "border border-line bg-card text-ink hover:bg-page"
            }`}
          >
            {copied ? "✓ План скопирован" : "Скопировать план"}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="ui-focus inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:bg-page sm:w-auto"
          >
            Закрыть
          </button>
        </div>
        {copyError ? (
          <p role="alert" className="mt-3 text-sm leading-5 text-danger">
            {copyError}
          </p>
        ) : null}
      </footer>
    </dialog>
  );
}
