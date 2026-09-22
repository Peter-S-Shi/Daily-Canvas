/** @vitest-environment jsdom */
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Dialog } from "./Dialog";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Harness({ dismissible }: { dismissible: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" id="opener" onClick={() => setOpen(true)}>Open</button>
    {open && <Dialog labelledBy="title" onClose={dismissible ? () => setOpen(false) : undefined}><h2 id="title">Title</h2><input id="field" autoFocus/></Dialog>}
  </>;
}

describe("Dialog focus and dismissal (behavior spec §12.1)", () => {
  let root: Root;
  beforeEach(() => { document.body.innerHTML = '<div id="root"></div>'; root = createRoot(document.getElementById("root")!); });
  afterEach(() => act(() => root.unmount()));

  const open = async (dismissible: boolean) => {
    await act(async () => root.render(<Harness dismissible={dismissible}/>));
    const opener = document.getElementById("opener") as HTMLButtonElement;
    opener.focus();
    await act(async () => opener.click());
    return opener;
  };
  const pressEscape = () => act(async () => { document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });

  it("is named by its heading and keeps an autofocused field focused on open", async () => {
    await open(true);
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")!)?.textContent).toBe("Title");
    expect(document.activeElement?.id).toBe("field");
  });

  it("closes on Escape and returns focus to the control that opened it", async () => {
    const opener = await open(true);
    await pressEscape();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("ignores Escape for decisions that must not be dismissed implicitly", async () => {
    await open(false);
    await pressEscape();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
