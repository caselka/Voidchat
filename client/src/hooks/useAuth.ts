import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 30000,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    refetch,
  };
}