import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "./App";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LEVEL_1_SOLUTION = "move(1)\nvacuum()\nmove(1)\nvacuum()\nmove(1)\nvacuum()";

let container: HTMLDivElement;
let root: Root;

function button(label: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find((b) =>
    b.textContent?.includes(label),
  );
  if (!found) throw new Error(`No button "${label}"`);
  return found;
}

function click(label: string) {
  act(() => button(label).click());
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Run the level 1 solution and stop the moment it is won. */
function runToWin() {
  click("Run");
  for (let i = 0; i < 100 && !container.textContent?.includes("Room clean in"); i++) {
    advance(50);
  }
  expect(container.textContent).toContain("Room clean in");
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  localStorage.setItem("roboclean_code", JSON.stringify({ 1: LEVEL_1_SOLUTION }));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<App />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("success modal timer", () => {
  it("appears 400ms after a win", () => {
    runToWin();
    advance(400);
    expect(container.textContent).toContain("Level Complete!");
    expect(localStorage.getItem("roboclean_completed")).toBe("[1]");
    expect(JSON.parse(localStorage.getItem("roboclean_stars") ?? "{}")[1]).toBeGreaterThan(0);
  });

  it("does not appear when Reset is pressed right after a win", () => {
    runToWin();
    click("Reset");
    advance(500);
    // The modal also needs steps to show, so it surfaces on the next Step
    click("Step");
    expect(container.textContent).not.toContain("Level Complete!");
  });

  it("does not appear when the level changes right after a win", () => {
    runToWin();
    click("Levels");
    click("L-Shaped Room");
    advance(500);
    // The modal also needs steps to show, so it surfaces on the next Step
    click("Step");
    expect(container.textContent).not.toContain("Level Complete!");
  });
});
