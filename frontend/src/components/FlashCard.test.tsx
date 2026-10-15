import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { FlashCard } from "./FlashCard";

it("shows only the two text sides after reveal", () => {
  render(<FlashCard question="Purpose" answer="цель" revealed={true} onReveal={vi.fn()} />);
  const card = screen.getByTestId("flash-card");
  expect(card.textContent).toBe("Purposeцель");
  expect(card).not.toHaveAttribute("role");
  expect(card).not.toHaveAttribute("tabindex");
  expect(within(card).queryByRole("button", { name: "Легко" })).toBeNull();
  expect(within(card).queryByText("английский → русский")).toBeNull();
});

it("hides the answer until an accessible reveal action", () => {
  const reveal = vi.fn();
  render(<FlashCard question="Purpose" answer="цель" revealed={false} onReveal={reveal} />);

  expect(screen.queryByText("цель")).toBeNull();
  fireEvent.keyDown(screen.getByRole("button", { name: "Показать ответ" }), { key: "Enter" });
  expect(reveal).toHaveBeenCalledOnce();
});
