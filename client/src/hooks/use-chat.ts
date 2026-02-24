import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";
import { useAuth } from "./use-auth";

export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
}

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const { user } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !user) return;

    const newSocket = io("/", { auth: { token } });
    
    newSocket.on("connect", () => {
      console.log("Connected to chat");
    });

    newSocket.on("userStatus", ({ userId, status }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (status === 'online') next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  return { socket, onlineUsers };
}

export function useChatHistory(otherUserId?: number) {
  const queryClient = useQueryClient();
  const queryKey = [api.messages.history.path, otherUserId];

  const query = useQuery<ChatMessage[]>({
    queryKey,
    queryFn: async () => {
      if (!otherUserId) return [];
      const res = await apiRequest("GET", buildUrl(api.messages.history.path, { userId: otherUserId }));
      return res.json();
    },
    enabled: !!otherUserId
  });

  return query;
}
