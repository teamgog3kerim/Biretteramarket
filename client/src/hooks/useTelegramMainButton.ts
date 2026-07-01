import { useEffect, useRef } from "react";
import { getTelegramWebApp } from "@/lib/telegram";

interface MainButtonOptions {
  text: string;
  onClick: () => void;
  visible?: boolean;
  progress?: boolean;
  disabled?: boolean;
}

// Drives Telegram's native Main Button (the large pinned button at the bottom
// of a Mini App). No-ops outside Telegram.
export function useTelegramMainButton({
  text,
  onClick,
  visible = true,
  progress = false,
  disabled = false,
}: MainButtonOptions) {
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  useEffect(() => {
    const mainButton = getTelegramWebApp()?.MainButton;
    if (!mainButton) return;

    const handler = () => onClickRef.current();
    mainButton.onClick(handler);

    return () => {
      mainButton.offClick(handler);
      mainButton.hide();
    };
  }, []);

  useEffect(() => {
    const mainButton = getTelegramWebApp()?.MainButton;
    if (!mainButton) return;

    mainButton.setText(text);

    if (visible) {
      mainButton.show();
    } else {
      mainButton.hide();
    }

    if (progress) {
      mainButton.showProgress();
    } else {
      mainButton.hideProgress();
    }

    // While a request is in flight the button must not be clickable, otherwise
    // it can trigger duplicate submissions.
    if (disabled || progress) {
      mainButton.disable();
    } else {
      mainButton.enable();
    }
  }, [text, visible, progress, disabled]);
}
