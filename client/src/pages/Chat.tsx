import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUsers } from "@/hooks/use-users";
import { useSocket, useChatHistory } from "@/hooks/use-chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Send, User as UserIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ChatPage() {
  const { user: currentUser } = useAuth();
  const { data: users } = useUsers();
  const { socket, onlineUsers } = useSocket();
  const [activeUserId, setActiveUserId] = useState<number | undefined>();
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: history = [], refetch } = useChatHistory(activeUserId);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    setMessages(history);
  }, [history]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      if (
        (msg.senderId === activeUserId && msg.receiverId === currentUser?.id) ||
        (msg.senderId === currentUser?.id && msg.receiverId === activeUserId)
      ) {
        setMessages(prev => [...prev, msg]);
        refetch(); // Ensure sync with backend
      }
    };

    socket.on("message", handleNewMessage);
    return () => {
      socket.off("message", handleNewMessage);
    };
  }, [socket, activeUserId, currentUser, refetch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeUserId || !socket) return;

    // Emit via socket
    socket.emit("sendMessage", {
      receiverId: activeUserId,
      content: messageInput
    });
    
    // Optimsitic UI update
    setMessages(prev => [...prev, {
      id: Date.now(),
      senderId: currentUser?.id,
      receiverId: activeUserId,
      content: messageInput,
      createdAt: new Date().toISOString()
    }]);
    
    setMessageInput("");
  };

  const otherUsers = users?.filter(u => u.id !== currentUser?.id) || [];
  const activeUser = otherUsers.find(u => u.id === activeUserId);

  return (
    <div className="h-screen py-4 md:py-8 px-4 flex">
      <div className="w-full max-w-5xl mx-auto bg-card border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Users List Sidebar */}
        <div className={`w-full md:w-80 border-r border-border bg-background/50 flex flex-col ${activeUserId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 border-b border-border">
            <h2 className="text-2xl font-display font-bold">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {otherUsers.map(u => (
              <div 
                key={u.id}
                onClick={() => setActiveUserId(u.id)}
                className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-200 hover:bg-white/5 ${activeUserId === u.id ? 'bg-primary/10 border border-primary/20' : ''}`}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12 border border-border">
                    <AvatarImage src={u.profilePicture ? `/uploads/${u.profilePicture}` : undefined} />
                    <AvatarFallback>{u.username.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {onlineUsers.has(u.id) && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-card rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className={`font-semibold truncate ${activeUserId === u.id ? 'text-primary' : ''}`}>{u.username}</h3>
                  <p className="text-xs text-muted-foreground truncate">{onlineUsers.has(u.id) ? 'Online' : 'Offline'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-background/30 ${!activeUserId ? 'hidden md:flex' : 'flex'}`}>
          {activeUser ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-card/50 backdrop-blur-xl flex items-center gap-4">
                <button 
                  className="md:hidden p-2 rounded-full hover:bg-white/10"
                  onClick={() => setActiveUserId(undefined)}
                >
                  ←
                </button>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={activeUser.profilePicture ? `/uploads/${activeUser.profilePicture}` : undefined} />
                  <AvatarFallback>{activeUser.username.substring(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold">{activeUser.username}</h3>
                  <p className="text-xs text-muted-foreground">{onlineUsers.has(activeUser.id) ? 'Active now' : 'Offline'}</p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                {messages.map((msg, idx) => {
                  const isMe = msg.senderId === currentUser?.id;
                  return (
                    <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-md ${
                        isMe 
                          ? 'bg-gradient-to-br from-primary to-purple-600 text-white rounded-br-sm' 
                          : 'bg-card border border-border text-foreground rounded-bl-sm'
                      }`}>
                        <p className="text-sm md:text-base leading-relaxed">{msg.content}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 mx-1">
                        {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : 'Just now'}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-card/50 backdrop-blur-xl border-t border-border">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-background rounded-full pl-6 pr-2 py-2 border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Message..."
                    className="flex-1 bg-transparent border-none focus:outline-none text-base"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!messageInput.trim()}
                    className="rounded-full w-10 h-10 bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20"
                  >
                    <Send className="w-5 h-5 -ml-0.5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <MessageCircle className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Your Messages</h2>
              <p className="text-center max-w-sm">Select a conversation or start a new one to chat with other users.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
