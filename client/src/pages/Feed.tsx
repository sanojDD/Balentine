import { useFeed } from "@/hooks/use-posts";
import { PostCard } from "@/components/PostCard";
import { Loader2 } from "lucide-react";

export default function FeedPage() {
  const { data: posts, isLoading } = useFeed();

  return (
    <div className="py-8 px-4 md:px-0 max-w-xl mx-auto min-h-screen flex flex-col">
      <header className="mb-8 hidden md:block">
        <h1 className="text-3xl font-display font-bold">Your Feed</h1>
        <p className="text-muted-foreground mt-1">Discover what's happening today</p>
      </header>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 flex-1 text-muted-foreground">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
          <p className="font-medium">Loading your feed...</p>
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-6">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 flex-1 glass-panel rounded-3xl">
          <div className="text-5xl mb-4">✨</div>
          <h2 className="text-2xl font-bold mb-2">Welcome to SocialAura</h2>
          <p className="text-muted-foreground text-center max-w-sm">
            Your feed is currently empty. Follow other users or create a post to get started!
          </p>
        </div>
      )}
    </div>
  );
}
