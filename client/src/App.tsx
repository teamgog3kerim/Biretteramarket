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
import SellerDashboard from "@/pages/seller-dashboard";
import ProductDetails from "@/pages/product-details";
import BottomNavigation from "@/components/bottom-navigation";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isTelegram, isAuthenticating, authError, retry } = useTelegramAuth();
  useTelegramBackButton();

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
            <Route path="/seller-dashboard" component={SellerDashboard} />
            <Route path="/product/:id" component={ProductDetails} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
      
      {isAuthenticated && <BottomNavigation />}
    </div>
  );
}

function App() {
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
