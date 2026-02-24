import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

export function useAuth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      if (!token) return null;
      try {
        const res = await fetch(api.auth.me.path, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 401) {
          localStorage.removeItem("token");
          return null;
        }
        if (!res.ok) throw new Error("Failed to fetch user");
        return await res.json();
      } catch (e) {
        return null;
      }
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: any) => {
      const res = await apiRequest("POST", api.auth.login.path, credentials);
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      queryClient.setQueryData([api.auth.me.path], data.user);
      setLocation("/");
      toast({ title: "Welcome back!", description: "Successfully logged in." });
    },
    onError: (error: Error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
  });

  const signupMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest("POST", api.auth.signup.path, userData);
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      queryClient.setQueryData([api.auth.me.path], data.user);
      setLocation("/");
      toast({ title: "Account created!", description: "Welcome to the platform." });
    },
    onError: (error: Error) => {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    }
  });

  const logout = () => {
    localStorage.removeItem("token");
    queryClient.setQueryData([api.auth.me.path], null);
    queryClient.clear();
    setLocation("/auth");
    toast({ title: "Logged out", description: "See you next time!" });
  };

  return {
    user,
    isLoading,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    signup: signupMutation.mutate,
    isSigningUp: signupMutation.isPending,
    logout,
  };
}
