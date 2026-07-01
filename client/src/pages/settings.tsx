import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Bell, Globe, Moon } from "lucide-react";
import { Link } from "wouter";

type Language = "en" | "am";

function usePersistedState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);

  return [value, setValue];
}

export default function Settings() {
  const [language, setLanguage] = usePersistedState<Language>("bt_language", "en");
  const [notifications, setNotifications] = usePersistedState<boolean>("bt_notifications", true);
  const [priceAlerts, setPriceAlerts] = usePersistedState<boolean>("bt_price_alerts", true);
  const [darkMode, setDarkMode] = usePersistedState<boolean>("bt_dark_mode", false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="pb-20">
      <div className="bg-primary p-4 text-primary-foreground">
        <div className="flex items-center">
          <Link href="/profile">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/20 mr-2 p-2"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Language */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Globe className="h-5 w-5 text-secondary" />
              <span className="font-medium">Language</span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={language === "en" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setLanguage("en")}
                data-testid="button-lang-en"
              >
                English
              </Button>
              <Button
                variant={language === "am" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setLanguage("am")}
                data-testid="button-lang-am"
              >
                አማርኛ
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="h-5 w-5 text-secondary" />
                <Label htmlFor="notifications" className="font-medium cursor-pointer">
                  Push Notifications
                </Label>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
                data-testid="switch-notifications"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="h-5 w-5 text-secondary" />
                <Label htmlFor="price-alerts" className="font-medium cursor-pointer">
                  Price Alerts
                </Label>
              </div>
              <Switch
                id="price-alerts"
                checked={priceAlerts}
                onCheckedChange={setPriceAlerts}
                data-testid="switch-price-alerts"
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Moon className="h-5 w-5 text-secondary" />
                <Label htmlFor="dark-mode" className="font-medium cursor-pointer">
                  Dark Mode
                </Label>
              </div>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={setDarkMode}
                data-testid="switch-dark-mode"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
