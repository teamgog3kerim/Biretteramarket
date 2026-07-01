import { useEffect } from "react";
import { useLocation } from "wouter";
import { getTelegramWebApp } from "@/lib/telegram";

// Root-level pages that use the bottom navigation and should NOT show a back button.
const ROOT_ROUTES = new Set([
  "/",
  "/categories",
  "/calculators",
  "/profile",
  "/seller-dashboard",
]);

// Shows Telegram's native Back button on detail/sub pages and wires it to
// browser history navigation.
export function useTelegramBackButton() {
  const [location, navigate] = useLocation();

  useEffect(() => {
    const wa = getTelegramWebApp();
    const backButton = wa?.BackButton;
    if (!backButton) return;

    const handleBack = () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate("/");
      }
    };

    const showBack = !ROOT_ROUTES.has(location);

    if (showBack) {
      backButton.onClick(handleBack);
      backButton.show();
    } else {
      backButton.hide();
    }

    return () => {
      backButton.offClick(handleBack);
    };
  }, [location, navigate]);
}
