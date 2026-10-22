import { screen, type BrowserWindow } from 'electron';
import { beginBigScreenSession, endBigScreenSession, getBigScreenSession, isBigScreenSessionActive } from './bigScreenSession';
import { chooseDisplay, type DisplayChoice, type DisplayRect } from './displayChoice';

export interface ListedDisplay {
  id: number;
  primary: boolean;
  width: number;
  height: number;
}

function listDisplayRects(): DisplayRect[] {
  const primaryId = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().map((display) => ({
    id: display.id,
    primary: display.id === primaryId,
    bounds: {
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
    },
  }));
}

export function listBigScreenDisplays(): ListedDisplay[] {
  return listDisplayRects().map((display) => ({
    id: display.id,
    primary: display.primary,
    width: display.bounds.width,
    height: display.bounds.height,
  }));
}

function moveToDisplay(win: BrowserWindow, choice: DisplayChoice): void {
  const chosen = chooseDisplay(listDisplayRects(), choice, win.getBounds());
  if (!chosen) return;
  const current = chooseDisplay(listDisplayRects(), 'current', win.getBounds());
  if (current?.id === chosen.id && win.isFullScreen()) return;
  if (win.isFullScreen()) {
    win.setFullScreen(false);
  }
  win.setBounds(chosen.bounds);
}

export function enterBigScreenWindow(win: BrowserWindow, choice: DisplayChoice): void {
  beginBigScreenSession(choice, win.isFullScreen());
  if (win.isMinimized()) win.restore();
  win.show();
  moveToDisplay(win, choice);
  if (!win.isFullScreen()) {
    win.setFullScreen(true);
  }
  win.focus();
}

export function exitBigScreenWindow(win: BrowserWindow): void {
  const previous = endBigScreenSession();
  if (!previous.active) return;
  if (win.isFullScreen() && !previous.wasFullscreen) {
    win.setFullScreen(false);
  } else if (!win.isFullScreen() && previous.wasFullscreen) {
    win.setFullScreen(true);
  }
  win.focus();
}

export function returnToBigScreenWindow(win: BrowserWindow): boolean {
  if (!isBigScreenSessionActive()) return false;
  const { displayChoice } = getBigScreenSession();
  enterBigScreenWindow(win, displayChoice);
  return true;
}

export function focusOnyxWindow(win: BrowserWindow | null): void {
  if (!win || win.isDestroyed()) return;
  if (isBigScreenSessionActive()) {
    enterBigScreenWindow(win, getBigScreenSession().displayChoice);
    return;
  }
  if (win.isMinimized()) win.restore();
  if (!win.isVisible()) win.show();
  win.show();
  win.focus();
}
