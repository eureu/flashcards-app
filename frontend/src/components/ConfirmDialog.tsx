import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  children: ReactNode;
  title: string;
  confirmLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ children, title, confirmLabel = "Удалить", pendingLabel = "Выполняем…", pending = false, error, onConfirm, onCancel }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    return () => returnFocusRef.current?.focus();
  }, []);

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ) ?? []);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", keyDown);
    return () => document.removeEventListener("keydown", keyDown);
  }, [onCancel, pending]);

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !pending && onCancel()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="dialog" ref={dialogRef}>
        <div className="dialog__copy">{children}</div>
        {error && <p className="notice notice--error dialog__error" role="alert">{error}</p>}
        <div className="button-row">
          <Button className="button--danger" disabled={pending} onClick={onConfirm}>{pending ? pendingLabel : confirmLabel}</Button>
          <button className="secondary-button" disabled={pending} onClick={onCancel} ref={cancelRef} type="button">Отмена</button>
        </div>
      </div>
    </div>
  );
}
