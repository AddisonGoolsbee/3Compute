// Small module-level registry tracking recent output activity per terminal
// tab and which tab is currently active. Used by the Explorer context menu
// to decide whether "Change directory" should be enabled (the shell is at
// a prompt) or greyed out (a subprocess is currently writing output).

type TabActivity = {
  lastOutputAt: number;
};

const BUSY_THRESHOLD_MS = 500;

const activity: Record<string, TabActivity> = {};
let activeTabId: string | null = null;

export function registerTerminalOutput(tabId: string): void {
  activity[tabId] = { lastOutputAt: Date.now() };
}

export function setActiveTerminalTab(tabId: string | null): void {
  activeTabId = tabId;
}

export function getActiveTerminalTabId(): string | null {
  return activeTabId;
}

export function isActiveTerminalBusy(): boolean {
  if (!activeTabId) return true; // no terminal, treat as unavailable
  const a = activity[activeTabId];
  if (!a) return false; // no output yet since connect — shell prompt ready
  return Date.now() - a.lastOutputAt < BUSY_THRESHOLD_MS;
}
