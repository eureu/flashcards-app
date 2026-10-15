import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Tabs } from "./Tabs";

it("keeps the selected icon tab accessible and changes sections by its label", () => {
  const onChange = vi.fn();
  render(<Tabs active="study" onChange={onChange} />);

  const study = screen.getByRole("button", { name: "Учиться" });
  expect(study).toHaveAttribute("aria-current", "page");
  expect(within(study).getByTestId("tab-icon-study")).toHaveAttribute("aria-hidden", "true");

  const words = screen.getByRole("button", { name: "Слова" });
  expect(within(words).getByTestId("tab-icon-words")).toHaveAttribute("aria-hidden", "true");
  fireEvent.click(words);

  expect(onChange).toHaveBeenCalledWith("words");
});

it("shows an icon and text label for every primary section", () => {
  render(<Tabs active="groups" onChange={vi.fn()} />);

  for (const [label, icon] of [["Учиться", "study"], ["Слова", "words"], ["Группы", "groups"]]) {
    const button = screen.getByRole("button", { name: label });
    expect(within(button).getByTestId(`tab-icon-${icon}`)).toBeInTheDocument();
  }
});
