"use client";

import { useEffect, useRef, type MouseEvent } from "react";

type ConfirmModalProps = {
  open: boolean;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmModal({
  open,
  message,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
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

    const anotherDialogOpen = document.querySelector("dialog[open]");
    document.body.style.overflow = anotherDialogOpen ? "hidden" : "";
  }, [open]);

  useEffect(() => {
    return () => {
      const anotherDialogOpen = document.querySelector("dialog[open]");
      document.body.style.overflow = anotherDialogOpen ? "hidden" : "";
    };
  }, []);

  function handleCancel() {
    onCancel();

    window.requestAnimationFrame(() => {
      openerRef.current?.focus();
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
      handleCancel();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-message"
      className="confirm-dialog"
      onCancel={(event) => {
        event.preventDefault();
        handleCancel();
      }}
      onClick={handleBackdropClick}
      onClose={() => {
        if (open) {
          handleCancel();
        }
      }}
    >
      <div className="p-4">
        <p
          id="confirm-dialog-message"
          className="text-sm leading-6 text-ink"
        >
          {message}
        </p>
        <div className="mt-4 flex flex-row justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="ui-focus inline-flex h-9 min-w-0 flex-1 items-center justify-center rounded-[var(--radius-control)] border border-line bg-card px-3 text-sm font-medium text-ink transition-colors hover:bg-page sm:flex-none sm:min-w-[6.75rem]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="ui-focus inline-flex h-9 min-w-0 flex-1 items-center justify-center rounded-[var(--radius-control)] bg-brand px-3 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active sm:flex-none sm:min-w-[6.75rem]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
