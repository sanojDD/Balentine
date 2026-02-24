import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { PostWithDetails, CommentWithUser } from "@shared/schema";

export function useFeed(userId?: number) {
  const url = userId ? `${api.posts.list.path}?userId=${userId}` : api.posts.list.path;
  return useQuery<PostWithDetails[]>({
    queryKey: [api.posts.list.path, userId],
    queryFn: async () => {
      const res = await apiRequest("GET", url);
      return res.json();
    }
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", api.posts.list.path, formData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] });
      toast({ title: "Post created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create post", description: err.message, variant: "destructive" });
    }
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: number) => {
      const res = await apiRequest("POST", buildUrl(api.posts.like.path, { id: postId }));
      return res.json();
    },
    onSuccess: (_, postId) => {
      // Optimistic-like invalidation (refetch feed)
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] });
    }
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (postId: number) => {
      await apiRequest("DELETE", buildUrl(api.posts.delete.path, { id: postId }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] });
      toast({ title: "Post deleted" });
    }
  });
}

export function usePostComments(postId: number) {
  return useQuery<CommentWithUser[]>({
    queryKey: [api.posts.comments.list.path, postId],
    queryFn: async () => {
      const res = await apiRequest("GET", buildUrl(api.posts.comments.list.path, { id: postId }));
      return res.json();
    },
    enabled: !!postId
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, content }: { postId: number, content: string }) => {
      const res = await apiRequest("POST", buildUrl(api.posts.comments.create.path, { id: postId }), { content });
      return res.json();
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: [api.posts.comments.list.path, postId] });
      queryClient.invalidateQueries({ queryKey: [api.posts.list.path] }); // update comment count
    }
  });
}
