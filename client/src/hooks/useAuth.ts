import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }), // Return null instead of throwing on 401
    retry: false,
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Prevent unnecessary refetches
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    refetch,
  };
}