"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { BrandMark, CloseIcon } from "@/components/UiIcons";
import type { UiSettings } from "@/lib/ui-settings";

type SettingsModalProps = {
  open: boolean;
  settings: UiSettings;
  onClose: () => void;
  onConfirmBeforeClearChange: (value: boolean) => void;
  onResetSettings: () => void;
};

const APP_FEATURES = [
  "Формирует готовый бриф",
  "Подготавливает вопросы к клиенту",
  "Предлагает структуру сайта",
  "Показывает порядок работы",
] as const;

export default function SettingsModal({
  open,
  settings,
  onClose,
  onConfirmBeforeClearChange,
  onResetSettings,
}: SettingsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [resetConfirming, setResetConfirming] = useState(false);

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

    const anotherDialogOpen = document.querySelector("dialog[open]");
    document.body.style.overflow = anotherDialogOpen ? "hidden" : "";
  }, [open]);

  useEffect(() => {
    return () => {
      const anotherDialogOpen = document.querySelector("dialog[open]");
      document.body.style.overflow = anotherDialogOpen ? "hidden" : "";
    };
  }, []);

  function handleClose() {
    setResetConfirming(false);
    onClose();

    window.requestAnimationFrame(() => {
      const opener =
        openerRef.current ?? document.getElementById("open-settings");
      opener?.focus();
    });
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    const dialog = dialogRef.current;

    if (!dialog || event.target !== dialog) {
      return;
    }

    const rect = dialog.getBoundingClientRect();
    const clickedOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;

    if (clickedOutside) {
      handleClose();
    }
  }

  function handleResetSettings() {
    onResetSettings();
    setResetConfirming(false);
  }

  return (
    <dialog
      ref={dialogRef}
      id="settings-dialog"
      aria-labelledby="settings-title"
      className="settings-dialog"
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      onClick={handleBackdropClick}
      onClose={() => {
        if (open) {
          handleClose();
        }
      }}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <h2
          id="settings-title"
          className="text-lg font-semibold tracking-tight text-ink"
        >
          Настройки
        </h2>
        <button
          type="button"
          aria-label="Закрыть"
          onClick={handleClose}
          className="ui-focus -mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-muted transition-colors hover:bg-page hover:text-ink active:bg-brand-soft active:text-brand"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
        <section aria-labelledby="settings-about-title">
          <h3
            id="settings-about-title"
            className="text-sm font-semibold tracking-tight text-ink"
          >
            О приложении
          </h3>
          <div className="mt-3 flex gap-3">
            <BrandMark className="mt-0.5 h-10 w-10 shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="text-base font-semibold tracking-tight text-ink">
                БрифМастер AI
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                AI-помощник для дизайнеров. Помогает превратить сообщение клиента
                в структурированный бриф.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-ink">
            {APP_FEATURES.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-6 text-muted">Версия: MVP</p>
        </section>

        <section
          aria-labelledby="settings-local-title"
          className="mt-5 border-t border-line pt-5"
        >
          <h3
            id="settings-local-title"
            className="text-sm font-semibold tracking-tight text-ink"
          >
            Локальные настройки
          </h3>

          <div className="mt-3 flex items-center justify-between gap-4 rounded-[var(--radius-control)] border border-line bg-page px-3.5 py-3">
            <p
              id="confirm-clear-label"
              className="min-w-0 text-sm leading-6 text-ink"
            >
              Подтверждать очистку данных
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={settings.confirmBeforeClear}
              aria-labelledby="confirm-clear-label"
              onClick={() => {
                onConfirmBeforeClearChange(!settings.confirmBeforeClear);
              }}
              className="ui-focus inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-[var(--radius-control)]"
            >
              <span
                className={`settings-switch ${
                  settings.confirmBeforeClear ? "is-on" : ""
                }`}
              >
                <span className="settings-switch-thumb" />
              </span>
            </button>
          </div>

          {resetConfirming ? (
            <div className="mt-3 rounded-[var(--radius-control)] border border-line bg-page px-3.5 py-3">
              <p className="text-sm leading-6 text-ink">
                Вернуть локальные настройки к значениям по умолчанию?
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setResetConfirming(false);
                  }}
                  className="ui-focus inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:bg-page sm:w-auto"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="ui-focus inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active sm:w-auto"
                >
                  Сбросить
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setResetConfirming(true);
              }}
              className="ui-focus mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:bg-page active:bg-brand-soft sm:w-auto"
            >
              Сбросить локальные настройки
            </button>
          )}
        </section>
      </div>

      <footer className="shrink-0 border-t border-line px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={handleClose}
          className="ui-focus inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:bg-page sm:w-auto"
        >
          Закрыть
        </button>
      </footer>
    </dialog>
  );
}
