import { useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useTelegramBackButton } from "@/hooks/useTelegramBackButton";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Categories from "@/pages/categories";
import Calculators from "@/pages/calculators";
import Profile from "@/pages/profile";
import Orders from "@/pages/orders";
import Favorites from "@/pages/favorites";
import Settings from "@/pages/settings";
import PaymentMethods from "@/pages/payment-methods";
import MarketAnalysis from "@/pages/market-analysis";
import SellerDashboard from "@/pages/seller-dashboard";
import ProductDetails from "@/pages/product-details";
import SellerPage from "@/pages/seller-page";
import AdminPage from "@/pages/admin";
import BottomNavigation from "@/components/bottom-navigation";
import AccountTypeModal from "@/components/account-type-modal";
import InterestsModal from "@/components/interests-modal";
import WelcomeModal from "@/components/welcome-modal";
import MyStoreFab from "@/components/my-store-fab";
import { isSellerType } from "@shared/schema";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { isTelegram, isAuthenticating, authError, retry } = useTelegramAuth();
  useTelegramBackButton();
  const [showWelcome, setShowWelcome] = useState(true);

  // Re-show the welcome popup every time the user comes back to the mini app
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setShowWelcome(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const needsAccountType = isAuthenticated && user != null && !user.accountTypeSelected;
  const needsInterests =
    isAuthenticated &&
    user != null &&
    user.accountTypeSelected === true &&
    (!user.interestedCategoryIds || user.interestedCategoryIds.length === 0);

  if (isLoading || (isTelegram && isAuthenticating && !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto bg-background min-h-screen relative">
      <Switch>
        {!isAuthenticated ? (
          <Route path="/" component={() => <Landing isTelegram={isTelegram} telegramError={authError} onTelegramRetry={retry} />} />
        ) : (
          <>
            <Route path="/" component={Home} />
            <Route path="/categories" component={Categories} />
            <Route path="/calculators" component={Calculators} />
            <Route path="/profile" component={Profile} />
            <Route path="/orders" component={Orders} />
            <Route path="/favorites" component={Favorites} />
            <Route path="/settings" component={Settings} />
            <Route path="/payment-methods" component={PaymentMethods} />
            <Route path="/market-analysis" component={MarketAnalysis} />
            <Route path="/seller-dashboard" component={SellerDashboard} />
            <Route path="/product/:id" component={ProductDetails} />
            <Route path="/seller/:id" component={SellerPage} />
            <Route path="/admin" component={AdminPage} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
      
      <WelcomeModal isOpen={isTelegram && showWelcome} onEnter={() => setShowWelcome(false)} />
      {!(isTelegram && showWelcome) && needsAccountType && <AccountTypeModal isOpen />}
      {!(isTelegram && showWelcome) && !needsAccountType && needsInterests && <InterestsModal isOpen />}
      {isAuthenticated && user != null && isSellerType(user.userType ?? "") && <MyStoreFab />}
      {isAuthenticated && <BottomNavigation />}
    </div>
  );
}

function useInitTheme() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem("bt_dark_mode");
      const darkMode = stored !== null ? JSON.parse(stored) === true : false;
      document.documentElement.classList.toggle("dark", darkMode);
    } catch {
      /* ignore */
    }
  }, []);
}

function App() {
  useInitTheme();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
