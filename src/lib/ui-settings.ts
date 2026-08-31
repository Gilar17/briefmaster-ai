"use client";

import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";
import type { AIProvider } from "@/types/brief";

export type UiTheme = "light" | "dark";

export type AccentColorId =
  | "purple"
  | "blue"
  | "cyan"
  | "teal"
  | "green"
  | "olive"
  | "orange"
  | "red"
  | "pink"
  | "sand";

export type AccentColor = {
  id: AccentColorId;
  label: string;
  hex: string;
  foreground: string;
};

export const ACCENT_COLORS: AccentColor[] = [
  { id: "purple", label: "Фиолетовый", hex: "#6D4DB3", foreground: "#ffffff" },
  { id: "blue", label: "Синий", hex: "#3F63C8", foreground: "#ffffff" },
  { id: "cyan", label: "Голубой", hex: "#278FB5", foreground: "#ffffff" },
  { id: "teal", label: "Бирюзовый", hex: "#268E87", foreground: "#ffffff" },
  { id: "green", label: "Зелёный", hex: "#438A63", foreground: "#ffffff" },
  { id: "olive", label: "Оливковый", hex: "#7A8245", foreground: "#ffffff" },
  { id: "orange", label: "Оранжевый", hex: "#C67A38", foreground: "#ffffff" },
  { id: "red", label: "Красный", hex: "#B95656", foreground: "#ffffff" },
  { id: "pink", label: "Розовый", hex: "#B75C87", foreground: "#ffffff" },
  { id: "sand", label: "Песочный", hex: "#FFB77B", foreground: "#3B2A1C" },
];

const ACCENT_IDS = new Set<AccentColorId>(
  ACCENT_COLORS.map((color) => color.id),
);

export type UiSettings = {
  confirmBeforeClear: boolean;
  defaultProvider: AIProvider;
  mobileAutoScroll: boolean;
  uiHints: boolean;
  theme: UiTheme;
  accentColor: AccentColorId;
};

export const DEFAULT_UI_SETTINGS: UiSettings = {
  confirmBeforeClear: true,
  defaultProvider: "openrouter",
  mobileAutoScroll: true,
  uiHints: true,
  theme: "light",
  accentColor: "purple",
};

export const UI_SETTINGS_STORAGE_KEY = "briefmaster-ui-settings";

const listeners = new Set<() => void>();
let snapshot: UiSettings = DEFAULT_UI_SETTINGS;
let snapshotRaw: string | null = null;
let hasRead = false;

function isAiProvider(value: unknown): value is AIProvider {
  return value === "openrouter" || value === "openai";
}

function isUiTheme(value: unknown): value is UiTheme {
  return value === "light" || value === "dark";
}

export function isAccentColorId(value: unknown): value is AccentColorId {
  return typeof value === "string" && ACCENT_IDS.has(value as AccentColorId);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseSettings(raw: string | null): UiSettings {
  if (!raw) {
    return DEFAULT_UI_SETTINGS;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== "object" || parsed === null) {
      return DEFAULT_UI_SETTINGS;
    }

    const record = parsed as Record<string, unknown>;

    return {
      confirmBeforeClear: readBoolean(
        record.confirmBeforeClear,
        DEFAULT_UI_SETTINGS.confirmBeforeClear,
      ),
      defaultProvider: isAiProvider(record.defaultProvider)
        ? record.defaultProvider
        : DEFAULT_UI_SETTINGS.defaultProvider,
      mobileAutoScroll: readBoolean(
        record.mobileAutoScroll,
        DEFAULT_UI_SETTINGS.mobileAutoScroll,
      ),
      uiHints: readBoolean(record.uiHints, DEFAULT_UI_SETTINGS.uiHints),
      theme: isUiTheme(record.theme) ? record.theme : DEFAULT_UI_SETTINGS.theme,
      accentColor: isAccentColorId(record.accentColor)
        ? record.accentColor
        : DEFAULT_UI_SETTINGS.accentColor,
    };
  } catch {
    return DEFAULT_UI_SETTINGS;
  }
}

function serializeSettings(settings: UiSettings): string {
  return JSON.stringify({
    confirmBeforeClear: settings.confirmBeforeClear,
    defaultProvider: settings.defaultProvider,
    mobileAutoScroll: settings.mobileAutoScroll,
    uiHints: settings.uiHints,
    theme: settings.theme,
    accentColor: settings.accentColor,
  });
}

export function applyUiAppearance(theme: UiTheme, accentColor: AccentColorId): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.accent = accentColor;
}

function readStoredSettings(): UiSettings {
  try {
    const raw = window.localStorage.getItem(UI_SETTINGS_STORAGE_KEY);

    if (hasRead && raw === snapshotRaw) {
      return snapshot;
    }

    hasRead = true;
    snapshotRaw = raw;
    snapshot = parseSettings(raw);
    return snapshot;
  } catch {
    hasRead = true;
    snapshotRaw = null;
    snapshot = DEFAULT_UI_SETTINGS;
    return snapshot;
  }
}

function emitChange() {
  hasRead = false;
  listeners.forEach((listener) => {
    listener();
  });
}

function handleStorage(event: StorageEvent) {
  if (event.key === UI_SETTINGS_STORAGE_KEY || event.key === null) {
    emitChange();
  }
}

function subscribe(listener: () => void) {
  const shouldBindStorage = listeners.size === 0;
  listeners.add(listener);

  if (shouldBindStorage) {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

export function saveUiSettings(settings: UiSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(UI_SETTINGS_STORAGE_KEY, serializeSettings(settings));
  } catch {
    // Игнорируем недоступность localStorage (приватный режим, квота).
  }

  snapshot = {
    confirmBeforeClear: settings.confirmBeforeClear,
    defaultProvider: settings.defaultProvider,
    mobileAutoScroll: settings.mobileAutoScroll,
    uiHints: settings.uiHints,
    theme: settings.theme,
    accentColor: settings.accentColor,
  };

  try {
    snapshotRaw = window.localStorage.getItem(UI_SETTINGS_STORAGE_KEY);
  } catch {
    snapshotRaw = null;
  }

  hasRead = true;
  applyUiAppearance(settings.theme, settings.accentColor);
  listeners.forEach((listener) => {
    listener();
  });
}

export function useUiSettings() {
  const settings = useSyncExternalStore(
    subscribe,
    readStoredSettings,
    () => DEFAULT_UI_SETTINGS,
  );

  useLayoutEffect(() => {
    applyUiAppearance(settings.theme, settings.accentColor);
  }, [settings.theme, settings.accentColor]);

  const updateSettings = useCallback((patch: Partial<UiSettings>) => {
    const current = readStoredSettings();
    saveUiSettings({
      confirmBeforeClear: patch.confirmBeforeClear ?? current.confirmBeforeClear,
      defaultProvider: patch.defaultProvider ?? current.defaultProvider,
      mobileAutoScroll: patch.mobileAutoScroll ?? current.mobileAutoScroll,
      uiHints: patch.uiHints ?? current.uiHints,
      theme: patch.theme ?? current.theme,
      accentColor: patch.accentColor ?? current.accentColor,
    });
  }, []);

  const resetSettings = useCallback(() => {
    saveUiSettings(DEFAULT_UI_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
