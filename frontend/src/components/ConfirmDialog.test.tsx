import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">Открыть подтверждение</button>
      {open && (
        <ConfirmDialog title="Выйти из группы" confirmLabel="Выйти" onCancel={() => setOpen(false)} onConfirm={vi.fn()}>
          <p>Общие слова исчезнут из набора.</p>
        </ConfirmDialog>
      )}
    </>
  );
}

it("moves focus into the dialog, closes on Escape and restores focus", () => {
  render(<Harness />);
  const trigger = screen.getByRole("button", { name: "Открыть подтверждение" });
  trigger.focus();
  fireEvent.click(trigger);

  expect(screen.getByRole("dialog", { name: "Выйти из группы" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Отмена" })).toHaveFocus();
  fireEvent.keyDown(document, { key: "Escape" });

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(trigger).toHaveFocus();
});

it("keeps a failure visible inside the dialog and disables repeat confirmation", () => {
  render(
    <ConfirmDialog title="Удалить карточку" error="Не удалось удалить карточку" pending confirmLabel="Удалить" pendingLabel="Удаляем…" onCancel={vi.fn()} onConfirm={vi.fn()}>
      <p>Удалить пару?</p>
    </ConfirmDialog>,
  );

  expect(screen.getByRole("dialog", { name: "Удалить карточку" })).toContainElement(screen.getByRole("alert"));
  expect(screen.getByRole("button", { name: "Удаляем…" })).toBeDisabled();
});
