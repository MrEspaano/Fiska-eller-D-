import { describe, expect, it } from "vitest";
import {
  createProgressPopupRuntime,
  enqueueProgressMessage,
  tickProgressPopupRuntime
} from "../src/game/ui/ProgressPopup";

describe("Progress popup runtime", () => {
  it("activates queued popup on tick", () => {
    const runtime = enqueueProgressMessage(createProgressPopupRuntime(), "Nivå upp!", 1000);
    const next = tickProgressPopupRuntime(runtime, 500);
    expect(next.active?.text).toBe("Nivå upp!");
    expect(next.queue.length).toBe(0);
  });

  it("expires popup and shows next queued popup", () => {
    let runtime = createProgressPopupRuntime();
    runtime = enqueueProgressMessage(runtime, "A", 1000);
    runtime = enqueueProgressMessage(runtime, "B", 1000);

    runtime = tickProgressPopupRuntime(runtime, 0);
    expect(runtime.active?.text).toBe("A");

    runtime = tickProgressPopupRuntime(runtime, 1000);
    expect(runtime.active?.text).toBe("B");
    expect(runtime.queue.length).toBe(0);
  });
});
