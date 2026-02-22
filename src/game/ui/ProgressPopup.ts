export interface PopupMessage {
  text: string;
  durationMs: number;
}

export interface ProgressPopupRuntime {
  active: PopupMessage | null;
  queue: PopupMessage[];
  shownAtMs: number;
}

export function createProgressPopupRuntime(): ProgressPopupRuntime {
  return {
    active: null,
    queue: [],
    shownAtMs: 0
  };
}

export function enqueueProgressMessage(
  runtime: ProgressPopupRuntime,
  text: string,
  durationMs = 2600
): ProgressPopupRuntime {
  return {
    ...runtime,
    queue: [...runtime.queue, { text, durationMs }]
  };
}

export function tickProgressPopupRuntime(runtime: ProgressPopupRuntime, nowMs: number): ProgressPopupRuntime {
  let next = runtime;

  if (!next.active && next.queue.length > 0) {
    const [active, ...rest] = next.queue;
    next = {
      active,
      queue: rest,
      shownAtMs: nowMs
    };
  }

  if (next.active && nowMs - next.shownAtMs >= next.active.durationMs) {
    next = {
      ...next,
      active: null
    };

    if (next.queue.length > 0) {
      const [active, ...rest] = next.queue;
      next = {
        active,
        queue: rest,
        shownAtMs: nowMs
      };
    }
  }

  return next;
}

export class ProgressPopup {
  private readonly el: HTMLDivElement;
  private runtime = createProgressPopupRuntime();

  constructor(root: HTMLElement) {
    root.querySelectorAll(".progress-popup").forEach((node) => node.remove());
    this.el = document.createElement("div");
    this.el.className = "progress-popup";
    root.appendChild(this.el);
  }

  enqueue(message: string, durationMs = 2600): void {
    this.runtime = enqueueProgressMessage(this.runtime, message, durationMs);
  }

  update(nowMs: number): void {
    this.runtime = tickProgressPopupRuntime(this.runtime, nowMs);
    if (!this.runtime.active) {
      this.el.classList.remove("show");
      return;
    }

    this.el.textContent = this.runtime.active.text;
    this.el.classList.add("show");
  }

  hide(): void {
    this.runtime = createProgressPopupRuntime();
    this.el.classList.remove("show");
  }

  destroy(): void {
    this.el.remove();
  }
}
