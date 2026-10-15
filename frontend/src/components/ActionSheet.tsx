import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { Icon } from "./Icon";

interface ActionSheetProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  returnFocusRef: RefObject<HTMLElement | null>;
}

export function ActionSheet({ title, open, onClose, children, returnFocusRef }: ActionSheetProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])",
    ) ?? []);
    const firstAction = dialog?.querySelector<HTMLElement>(".action-sheet__content button:not([disabled])");
    firstAction?.focus();

    function keyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
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
    return () => {
      document.removeEventListener("keydown", keyDown);
      returnFocusRef.current?.focus();
    };
  }, [onClose, open, returnFocusRef]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div aria-labelledby={titleId} aria-modal="true" className="action-sheet" ref={dialogRef} role="dialog">
        <div className="action-sheet__handle" />
        <header>
          <h2 id={titleId}>{title}</h2>
          <button aria-label="Закрыть" className="icon-button" onClick={onClose} type="button"><Icon name="close" size={19} /></button>
        </header>
        <div className="action-sheet__content">{children}</div>
      </div>
    </div>
  );
}
