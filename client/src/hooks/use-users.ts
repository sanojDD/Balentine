import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, User } from "@shared/schema";

export function useUsers() {
  return useQuery<User[]>({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.users.list.path);
      return res.json();
    }
  });
}

export function useProfile(id: number) {
  return useQuery<UserProfile>({
    queryKey: [api.users.get.path, id],
    queryFn: async () => {
      const res = await apiRequest("GET", buildUrl(api.users.get.path, { id }));
      return res.json();
    },
    enabled: !!id
  });
}

export function useFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", buildUrl(api.users.follow.path, { id: userId }));
      return res.json();
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: [api.users.get.path, userId] });
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] }); // update following count
    }
  });
}

export function useAdminActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const banUser = useMutation({
    mutationFn: async ({ id, isBanned }: { id: number, isBanned: boolean }) => {
      const res = await apiRequest("PATCH", buildUrl(api.users.ban.path, { id }), { isBanned });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "User status updated" });
    }
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", buildUrl(api.users.delete.path, { id }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      toast({ title: "User deleted" });
    }
  });

  return { banUser, deleteUser };
}
