import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, Grid3x3, Calculator, User } from "lucide-react";

export default function BottomNavigation() {
  const [location] = useLocation();

  const navItems = [
    {
      name: "Home",
      icon: Home,
      path: "/",
    },
    {
      name: "Categories",
      icon: Grid3x3,
      path: "/categories",
    },
    {
      name: "Calculators",
      icon: Calculator,
      path: "/calculators",
    },
    {
      name: "Profile",
      icon: User,
      path: "/profile",
    },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-background border-t border-border">
      <div className="flex">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.name} href={item.path} className="flex-1">
              <button
                className={cn(
                  "w-full p-3 flex flex-col items-center space-y-1 transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.name}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
