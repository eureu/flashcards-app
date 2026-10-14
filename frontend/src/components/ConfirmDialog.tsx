import type { ReactNode } from "react";
import { Button } from "./Button";

export function ConfirmDialog({ children, onConfirm, onCancel }: { children: ReactNode; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div role="dialog" aria-modal="true" className="dialog">
      {children}
      <div className="button-row">
        <Button onClick={onConfirm}>Удалить</Button>
        <Button onClick={onCancel}>Отмена</Button>
      </div>
    </div>
  );
}
