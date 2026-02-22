export function shouldOpenWorldPauseMenu(
  menuOpen: boolean,
  catchOverlayOpen: boolean,
  freezerPanelOpen: boolean,
  menuTogglePressed: boolean
): boolean {
  return !menuOpen && !catchOverlayOpen && !freezerPanelOpen && menuTogglePressed;
}

export function shouldHandleWorldAction(
  menuOpen: boolean,
  catchOverlayOpen: boolean,
  freezerPanelOpen: boolean,
  actionPressed: boolean
): boolean {
  return !menuOpen && !catchOverlayOpen && !freezerPanelOpen && actionPressed;
}

export function shouldOpenCabinPauseMenu(menuOpen: boolean, panelOpen: boolean, menuTogglePressed: boolean): boolean {
  return !menuOpen && !panelOpen && menuTogglePressed;
}
