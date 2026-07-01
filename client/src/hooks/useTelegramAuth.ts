import { useEffect, useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  initTelegramWebApp,
  isTelegramWebApp,
  getTelegramInitData,
} from "@/lib/telegram";

// Detects the Telegram Mini App environment, initializes the SDK, and
// automatically signs the user in using Telegram's initData.
export function useTelegramAuth() {
  const [isTelegram] = useState(() => isTelegramWebApp());
  const [isAuthenticating, setIsAuthenticating] = useState(() =>
    isTelegramWebApp(),
  );
  const [authError, setAuthError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = () => {
    setAuthError(false);
    setIsAuthenticating(true);
    setAttempt((n) => n + 1);
  };

  useEffect(() => {
    if (!isTelegram) return;

    initTelegramWebApp();

    const initData = getTelegramInitData();
    if (!initData) {
      setIsAuthenticating(false);
      setAuthError(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await apiRequest("POST", "/api/auth/telegram", { initData });
        if (!cancelled) {
          setAuthError(false);
          await queryClient.invalidateQueries({
            queryKey: ["/api/auth/user"],
          });
        }
      } catch (err) {
        console.error("Telegram authentication failed", err);
        if (!cancelled) setAuthError(true);
      } finally {
        if (!cancelled) setIsAuthenticating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isTelegram, attempt]);

  return { isTelegram, isAuthenticating, authError, retry };
}
