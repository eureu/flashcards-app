import { useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ActionSheet } from "./ActionSheet";

function Fixture() {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={opener} onClick={() => setOpen(true)}>Открыть добавление</button>
      <ActionSheet open={open} onClose={() => setOpen(false)} returnFocusRef={opener} title="Добавить слова">
        <button>Вставить список</button>
        <button>Добавить одну пару</button>
      </ActionSheet>
    </>
  );
}

it("focuses the first action and returns focus after Escape", () => {
  render(<Fixture />);
  const opener = screen.getByRole("button", { name: "Открыть добавление" });

  fireEvent.click(opener);
  expect(screen.getByRole("dialog", { name: "Добавить слова" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Вставить список" })).toHaveFocus();

  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "Добавить слова" })).toBeNull();
  expect(opener).toHaveFocus();
});
