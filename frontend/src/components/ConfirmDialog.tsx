import type { ReactNode } from "react";
import { Button } from "./Button";

export function ConfirmDialog({ children, onConfirm, onCancel }: { children: ReactNode; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="dialog-backdrop">
      <div role="dialog" aria-modal="true" aria-label="Подтверждение удаления" className="dialog">
        <div className="dialog__copy">{children}</div>
        <div className="button-row">
          <Button className="button--danger" onClick={onConfirm}>Удалить</Button>
          <button className="secondary-button" onClick={onCancel} type="button">Отмена</button>
        </div>
      </div>
    </div>
  );
}
