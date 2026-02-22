export type MenuMode = "boot" | "pause";
type MenuView = "main" | "settings" | "help";

export interface MenuSettingsSnapshot {
  soundOn: boolean;
  musicVolume: number;
  sfxVolume: number;
}

interface MenuOverlayHandlers {
  onStartOrResume: () => void;
  onExitToMenu: () => void;
  onClose: () => void;
  onSoundOnChange: (value: boolean) => void;
  onMusicVolumeChange: (value: number) => void;
  onSfxVolumeChange: (value: number) => void;
  getSettings: () => MenuSettingsSnapshot;
  onNavigate?: () => void;
  onConfirm?: () => void;
  onBack?: () => void;
}

interface MainMenuItem {
  id: "start" | "settings" | "help" | "exit";
  label: string;
}

export const MENU_TITLE = "Välkommen - Fiska eller DÖ";

export const MAIN_MENU_ITEMS: MainMenuItem[] = [
  { id: "start", label: "Starta spelet" },
  { id: "settings", label: "Inställningar" },
  { id: "help", label: "Hjälp" },
  { id: "exit", label: "Avsluta till meny" }
];

export function getNextMenuIndex(current: number, direction: "up" | "down", length: number): number {
  if (length <= 0) {
    return 0;
  }
  if (direction === "down") {
    return (current + 1) % length;
  }
  return (current - 1 + length) % length;
}

export function resolveEscapeAction(mode: MenuMode, view: MenuView): "none" | "back_to_main" | "close_menu" {
  if (view !== "main") {
    return "back_to_main";
  }
  return mode === "pause" ? "close_menu" : "none";
}

export class MenuOverlay {
  private readonly el: HTMLDivElement;
  private readonly modeLabel: HTMLDivElement;
  private readonly listEl: HTMLDivElement;
  private readonly subPanelEl: HTMLDivElement;

  private open = false;
  private mode: MenuMode = "boot";
  private view: MenuView = "main";
  private selectedIndex = 0;

  private readonly onKeyDownBound = (event: KeyboardEvent) => this.onKeyDown(event);

  constructor(root: HTMLElement, private readonly handlers: MenuOverlayHandlers) {
    root.querySelectorAll(".menu-overlay").forEach((node) => node.remove());

    this.el = document.createElement("div");
    this.el.className = "menu-overlay";
    this.el.innerHTML = `
      <div class="menu-panel" role="dialog" aria-modal="true">
        <h1 class="menu-title-3d"></h1>
        <div class="menu-mode-label"></div>
        <div class="menu-list"></div>
        <div class="menu-subpanel"></div>
      </div>
    `;
    root.appendChild(this.el);

    this.modeLabel = this.el.querySelector(".menu-mode-label") as HTMLDivElement;
    this.listEl = this.el.querySelector(".menu-list") as HTMLDivElement;
    this.subPanelEl = this.el.querySelector(".menu-subpanel") as HTMLDivElement;

    const title = this.el.querySelector(".menu-title-3d") as HTMLHeadingElement;
    title.textContent = MENU_TITLE;

    window.addEventListener("keydown", this.onKeyDownBound);
    this.render();
  }

  show(mode: MenuMode): void {
    this.open = true;
    this.mode = mode;
    this.view = "main";
    this.selectedIndex = 0;
    this.el.classList.add("show");
    this.render();
  }

  hide(): void {
    this.open = false;
    this.view = "main";
    this.el.classList.remove("show");
  }

  isOpen(): boolean {
    return this.open;
  }

  setMode(mode: MenuMode): void {
    this.mode = mode;
    if (this.open) {
      this.render();
    }
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDownBound);
    this.el.remove();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.open) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      const action = resolveEscapeAction(this.mode, this.view);
      if (action === "back_to_main") {
        this.handlers.onBack?.();
        this.view = "main";
        this.render();
      } else if (action === "close_menu") {
        this.handlers.onBack?.();
        this.handlers.onClose();
      }
      return;
    }

    if (this.view !== "main") {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.handlers.onNavigate?.();
      this.selectedIndex = getNextMenuIndex(this.selectedIndex, "down", MAIN_MENU_ITEMS.length);
      this.renderMainMenu();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.handlers.onNavigate?.();
      this.selectedIndex = getNextMenuIndex(this.selectedIndex, "up", MAIN_MENU_ITEMS.length);
      this.renderMainMenu();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      this.activateItem(MAIN_MENU_ITEMS[this.selectedIndex].id);
    }
  }

  private render(): void {
    this.modeLabel.textContent = this.mode === "boot" ? "Startmeny" : "Pausmeny";

    if (this.view === "main") {
      this.renderMainMenu();
      this.subPanelEl.innerHTML = "";
      return;
    }

    this.listEl.innerHTML = "";
    if (this.view === "settings") {
      this.renderSettings();
      return;
    }
    this.renderHelp();
  }

  private renderMainMenu(): void {
    this.subPanelEl.innerHTML = "";
    this.listEl.innerHTML = MAIN_MENU_ITEMS.map((item, idx) => `
      <button class="menu-button ${idx === this.selectedIndex ? "active" : ""}" data-menu-id="${item.id}" type="button">
        ${item.label}
      </button>
    `).join("");

    this.listEl.querySelectorAll<HTMLButtonElement>(".menu-button").forEach((button) => {
      const id = button.dataset.menuId as MainMenuItem["id"];
      button.addEventListener("mouseenter", () => {
        const idx = MAIN_MENU_ITEMS.findIndex((x) => x.id === id);
        if (idx >= 0) {
          this.selectedIndex = idx;
          this.listEl.querySelectorAll<HTMLButtonElement>(".menu-button").forEach((el, i) => {
            el.classList.toggle("active", i === this.selectedIndex);
          });
        }
      });
      button.addEventListener("click", () => this.activateItem(id));
    });
  }

  private renderSettings(): void {
    const settings = this.handlers.getSettings();
    this.subPanelEl.innerHTML = `
      <div class="menu-subpanel">
        <h3>Inställningar</h3>
        <label class="menu-settings-row">
          <span>Ljud</span>
          <input type="checkbox" data-setting="soundOn" ${settings.soundOn ? "checked" : ""} />
        </label>
        <label class="menu-settings-row">
          <span>Musikvolym: <strong data-label="music">${settings.musicVolume}</strong></span>
          <input type="range" min="0" max="100" step="5" value="${settings.musicVolume}" data-setting="musicVolume" />
        </label>
        <label class="menu-settings-row">
          <span>SFX-volym: <strong data-label="sfx">${settings.sfxVolume}</strong></span>
          <input type="range" min="0" max="100" step="5" value="${settings.sfxVolume}" data-setting="sfxVolume" />
        </label>
        <button class="menu-button" data-settings-back type="button">Tillbaka</button>
      </div>
    `;

    const soundToggle = this.subPanelEl.querySelector<HTMLInputElement>('input[data-setting="soundOn"]');
    const musicRange = this.subPanelEl.querySelector<HTMLInputElement>('input[data-setting="musicVolume"]');
    const sfxRange = this.subPanelEl.querySelector<HTMLInputElement>('input[data-setting="sfxVolume"]');
    const musicLabel = this.subPanelEl.querySelector<HTMLElement>('[data-label="music"]');
    const sfxLabel = this.subPanelEl.querySelector<HTMLElement>('[data-label="sfx"]');

    soundToggle?.addEventListener("change", () => {
      this.handlers.onNavigate?.();
      this.handlers.onSoundOnChange(Boolean(soundToggle.checked));
    });
    musicRange?.addEventListener("input", () => {
      const value = Number(musicRange.value);
      if (musicLabel) {
        musicLabel.textContent = String(value);
      }
      this.handlers.onMusicVolumeChange(value);
    });
    sfxRange?.addEventListener("input", () => {
      const value = Number(sfxRange.value);
      if (sfxLabel) {
        sfxLabel.textContent = String(value);
      }
      this.handlers.onSfxVolumeChange(value);
    });

    this.subPanelEl.querySelector("[data-settings-back]")?.addEventListener("click", () => {
      this.handlers.onBack?.();
      this.view = "main";
      this.render();
    });
  }

  private renderHelp(): void {
    this.subPanelEl.innerHTML = `
      <div class="menu-subpanel menu-help">
        <h3>Hjälp</h3>
        <p>WASD/Piltangenter: rörelse</p>
        <p>SPACE/E: interagera/fiska</p>
        <p>ESC: meny</p>
        <p>Mobil: joystick + A-knapp</p>
        <button class="menu-button" data-help-back type="button">Tillbaka</button>
      </div>
    `;

    this.subPanelEl.querySelector("[data-help-back]")?.addEventListener("click", () => {
      this.handlers.onBack?.();
      this.view = "main";
      this.render();
    });
  }

  private activateItem(id: MainMenuItem["id"]): void {
    if (id === "settings") {
      this.handlers.onNavigate?.();
      this.view = "settings";
      this.render();
      return;
    }

    if (id === "help") {
      this.handlers.onNavigate?.();
      this.view = "help";
      this.render();
      return;
    }

    if (id === "exit") {
      this.handlers.onBack?.();
      this.handlers.onExitToMenu();
      return;
    }

    this.handlers.onConfirm?.();
    this.handlers.onStartOrResume();
  }
}
