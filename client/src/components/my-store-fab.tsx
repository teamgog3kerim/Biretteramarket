import { Link, useLocation } from "wouter";
import { Store } from "lucide-react";

export default function MyStoreFab() {
  const [location] = useLocation();

  if (location.startsWith("/seller-dashboard")) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl pointer-events-none flex justify-end pr-4">
      <Link
        href="/seller-dashboard"
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-primary text-primary-foreground pl-4 pr-5 py-3 shadow-lg hover:opacity-90 active:scale-95 transition-all"
        aria-label="Go to my store"
        data-testid="button-my-store-fab"
      >
        <Store className="h-5 w-5" />
        <span className="text-sm font-semibold">My Store</span>
      </Link>
    </div>
  );
}
