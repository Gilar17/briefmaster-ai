"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { CloseIcon } from "@/components/UiIcons";

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

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
    };
  }, []);

  function handleClose() {
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
          className="ui-focus -mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-muted transition-colors hover:bg-page hover:text-ink"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </header>
      <div className="px-4 py-4 sm:px-5">
        <p className="text-sm leading-6 text-muted">
          Здесь будут настройки приложения.
        </p>
      </div>
    </dialog>
  );
}
