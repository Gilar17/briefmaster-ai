"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { BrandMark, CloseIcon } from "@/components/UiIcons";
import {
  ACCENT_COLORS,
  type UiSettings,
  type UiTheme,
} from "@/lib/ui-settings";
import type { AIProvider } from "@/types/brief";

type SettingsModalProps = {
  open: boolean;
  settings: UiSettings;
  onClose: () => void;
  onSettingsChange: (patch: Partial<UiSettings>) => void;
  onResetSettings: () => void;
};

const APP_FEATURES = [
  "Формирует готовый бриф",
  "Подготавливает вопросы к клиенту",
  "Предлагает структуру сайта",
] as const;

const PROVIDER_OPTIONS: { value: AIProvider; label: string }[] = [
  { value: "openrouter", label: "OpenRouter" },
  { value: "openai", label: "OpenAI" },
];

const THEME_OPTIONS: { value: UiTheme; label: string }[] = [
  { value: "light", label: "Светлая" },
  { value: "dark", label: "Тёмная" },
];

export default function SettingsModal({
  open,
  settings,
  onClose,
  onSettingsChange,
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
            <li className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <div className="min-w-0">
                <p>Формирует порядок работы</p>
                <p className="mt-0.5 pl-0.5 text-[13px] leading-5 text-muted">
                  Позволяет планировать этапы и даты выполнения
                </p>
              </div>
            </li>
          </ul>
          <p className="mt-4 text-sm leading-6 text-muted">Версия 1.0.0</p>
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

          <div className="settings-list">
            <SettingsSwitchRow
              id="confirm-clear-label"
              label="Подтверждать очистку данных"
              checked={settings.confirmBeforeClear}
              onChange={(value) => {
                onSettingsChange({ confirmBeforeClear: value });
              }}
            />

            <SettingsChoiceRow
              id="default-provider-label"
              label="AI-провайдер по умолчанию"
            >
              {PROVIDER_OPTIONS.map((option) => {
                const selected = settings.defaultProvider === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      onSettingsChange({ defaultProvider: option.value });
                    }}
                    className={`settings-segment-btn ui-focus ${
                      selected ? "is-selected" : ""
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </SettingsChoiceRow>

            <SettingsSwitchRow
              id="mobile-autoscroll-label"
              label="Автопрокрутка к исходным данным"
              checked={settings.mobileAutoScroll}
              onChange={(value) => {
                onSettingsChange({ mobileAutoScroll: value });
              }}
            />

            <SettingsSwitchRow
              id="ui-hints-label"
              label="Подсказки интерфейса"
              checked={settings.uiHints}
              onChange={(value) => {
                onSettingsChange({ uiHints: value });
              }}
            />

            <SettingsChoiceRow id="theme-label" label="Тема">
              {THEME_OPTIONS.map((option) => {
                const selected = settings.theme === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      onSettingsChange({ theme: option.value });
                    }}
                    className={`settings-segment-btn ui-focus ${
                      selected ? "is-selected" : ""
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </SettingsChoiceRow>
          </div>

          <div className="settings-accent-block">
            <p id="accent-color-label" className="text-sm leading-5 text-ink">
              Основной цвет
            </p>
            <div
              role="group"
              aria-labelledby="accent-color-label"
              className="accent-swatches"
            >
              {ACCENT_COLORS.map((color) => {
                const selected = settings.accentColor === color.id;

                return (
                  <button
                    key={color.id}
                    type="button"
                    title={color.label}
                    aria-label={color.label}
                    aria-pressed={selected}
                    onClick={() => {
                      onSettingsChange({ accentColor: color.id });
                    }}
                    className={`accent-swatch ui-focus ${
                      selected ? "is-selected" : ""
                    }`}
                    style={{
                      backgroundColor: color.hex,
                      color: color.hex,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {resetConfirming ? (
            <div className="mt-3 rounded-[var(--radius-control)] border border-line bg-page px-3 py-3">
              <p className="text-sm leading-6 text-ink">
                Вернуть локальные настройки к значениям по умолчанию?
              </p>
              <div className="mt-3 flex flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetConfirming(false);
                  }}
                  className="ui-focus inline-flex h-9 min-w-0 flex-1 items-center justify-center rounded-[var(--radius-control)] border border-line bg-card px-3 text-sm font-medium text-ink transition-colors hover:bg-page sm:flex-none sm:min-w-[6.75rem]"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="ui-focus inline-flex h-9 min-w-0 flex-1 items-center justify-center rounded-[var(--radius-control)] bg-brand px-3 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover active:bg-brand-active sm:flex-none sm:min-w-[6.75rem]"
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
              className="ui-focus mt-3 inline-flex h-9 max-w-full items-center justify-center rounded-[var(--radius-control)] border border-line bg-card px-3 text-sm font-medium text-ink transition-colors hover:bg-page active:bg-brand-soft"
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
          className="ui-focus inline-flex h-9 items-center justify-center rounded-[var(--radius-control)] border border-line bg-card px-3 text-sm font-medium text-ink transition-colors hover:bg-page"
        >
          Закрыть
        </button>
      </footer>
    </dialog>
  );
}

function SettingsSwitchRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="settings-row">
      <p id={id} className="min-w-0 flex-1 text-sm leading-5 text-ink">
        {label}
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => {
          onChange(!checked);
        }}
        className="ui-focus inline-flex h-8 w-11 shrink-0 items-center justify-center rounded-full"
      >
        <span className={`settings-switch ${checked ? "is-on" : ""}`}>
          <span className="settings-switch-thumb" />
        </span>
      </button>
    </div>
  );
}

function SettingsChoiceRow({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="settings-row">
      <p id={id} className="min-w-0 flex-1 text-sm leading-5 text-ink">
        {label}
      </p>
      <div
        role="group"
        aria-labelledby={id}
        className="settings-segment"
      >
        {children}
      </div>
    </div>
  );
}
