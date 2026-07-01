// Lightweight helpers around the Telegram Mini App (WebApp) JS SDK.
// The SDK is loaded via a script tag in index.html and attaches to window.Telegram.

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: Record<string, any>;
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  isExpanded: boolean;
  ready: () => void;
  expand: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

// We are running inside Telegram only when the SDK exposes initData.
export function isTelegramWebApp(): boolean {
  const wa = getTelegramWebApp();
  return !!wa && typeof wa.initData === "string" && wa.initData.length > 0;
}

// Called once on startup to make the app feel native inside Telegram.
export function initTelegramWebApp(): void {
  const wa = getTelegramWebApp();
  if (!wa) return;

  wa.ready();
  wa.expand();

  // Match the app's brand primary color (see index.css --primary #BB3E00)
  try {
    wa.setHeaderColor("#BB3E00");
    wa.setBackgroundColor("#ffffff");
  } catch {
    // older Telegram clients may not support these; safe to ignore
  }

  if (wa.colorScheme === "dark") {
    document.documentElement.classList.add("dark");
  }
}

export function getTelegramInitData(): string | null {
  const wa = getTelegramWebApp();
  return wa?.initData || null;
}
