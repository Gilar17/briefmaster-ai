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
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <p
          id="confirm-dialog-message"
          className="text-sm leading-6 text-ink sm:text-base"
        >
          {message}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleCancel}
            className="ui-focus inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:bg-page sm:w-auto sm:min-w-[8.5rem]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="ui-focus inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active sm:w-auto sm:min-w-[8.5rem]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
