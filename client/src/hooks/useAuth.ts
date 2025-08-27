import { useQuery } from "@tanstack/react-query";
import type { User, Subscription } from "@shared/schema";

export type AuthUser = User & {
  subscription?: Subscription | null;
};

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
