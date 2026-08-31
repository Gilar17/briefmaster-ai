"use client";

import { useCallback, useSyncExternalStore } from "react";

export type UiSettings = {
  confirmBeforeClear: boolean;
};

export const DEFAULT_UI_SETTINGS: UiSettings = {
  confirmBeforeClear: true,
};

export const UI_SETTINGS_STORAGE_KEY = "briefmaster-ui-settings";

const listeners = new Set<() => void>();
let snapshot: UiSettings = DEFAULT_UI_SETTINGS;
let snapshotRaw: string | null = null;
let hasRead = false;

function isUiSettings(value: unknown): value is UiSettings {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as UiSettings).confirmBeforeClear === "boolean"
  );
}

function parseSettings(raw: string | null): UiSettings {
  if (!raw) {
    return DEFAULT_UI_SETTINGS;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isUiSettings(parsed)) {
      return DEFAULT_UI_SETTINGS;
    }

    return {
      confirmBeforeClear: parsed.confirmBeforeClear,
    };
  } catch {
    return DEFAULT_UI_SETTINGS;
  }
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
    window.localStorage.setItem(
      UI_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        confirmBeforeClear: settings.confirmBeforeClear,
      }),
    );
  } catch {
    // Игнорируем недоступность localStorage (приватный режим, квота).
  }

  snapshot = {
    confirmBeforeClear: settings.confirmBeforeClear,
  };

  try {
    snapshotRaw = window.localStorage.getItem(UI_SETTINGS_STORAGE_KEY);
  } catch {
    snapshotRaw = null;
  }

  hasRead = true;
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

  const updateSettings = useCallback((patch: Partial<UiSettings>) => {
    const current = readStoredSettings();
    saveUiSettings({
      confirmBeforeClear: patch.confirmBeforeClear ?? current.confirmBeforeClear,
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
