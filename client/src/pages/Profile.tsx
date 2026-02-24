import { useRoute } from "wouter";
import { useProfile, useFollow } from "@/hooks/use-users";
import { useFeed } from "@/hooks/use-posts";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Grid, Bookmark, Camera } from "lucide-react";

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:id");
  const userId = params?.id ? parseInt(params.id) : undefined;
  
  const { user: currentUser } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useProfile(userId!);
  const { data: posts, isLoading: isPostsLoading } = useFeed(userId);
  const { mutate: followUser, isPending: isFollowingState } = useFollow();

  const isOwner = currentUser?.id === userId;

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col">
        <h2 className="text-2xl font-bold">User not found</h2>
        <p className="text-muted-foreground">The link you followed may be broken.</p>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 md:px-0 max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 mb-16">
        <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-card shadow-2xl">
          <AvatarImage src={profile.profilePicture ? `/uploads/${profile.profilePicture}` : undefined} />
          <AvatarFallback className="text-4xl bg-primary/20 text-primary">
            {profile.username.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <h1 className="text-3xl font-display font-bold">{profile.username}</h1>
            
            {!isOwner && (
              <Button 
                variant={profile.isFollowing ? "outline" : "default"}
                onClick={() => followUser(profile.id)}
                disabled={isFollowingState}
                className={`rounded-xl px-8 font-semibold transition-all ${!profile.isFollowing && 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25'}`}
              >
                {profile.isFollowing ? "Following" : "Follow"}
              </Button>
            )}
            
            {isOwner && (
              <Button variant="outline" className="rounded-xl font-semibold">
                Edit Profile
              </Button>
            )}
          </div>
          
          <div className="flex justify-center md:justify-start gap-6 py-2">
            <div className="text-center md:text-left"><span className="font-bold text-lg">{posts?.length || 0}</span> posts</div>
            <div className="text-center md:text-left"><span className="font-bold text-lg">{profile.followersCount}</span> followers</div>
            <div className="text-center md:text-left"><span className="font-bold text-lg">{profile.followingCount}</span> following</div>
          </div>
          
          <div className="pt-2">
            <p className="text-base text-foreground/90 max-w-md mx-auto md:mx-0 whitespace-pre-wrap">
              {profile.bio || "No bio yet."}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center border-t border-border">
        <div className="flex gap-12">
          <button className="flex items-center gap-2 py-4 border-t-2 border-foreground text-sm font-semibold tracking-widest uppercase">
            <Grid className="w-4 h-4" /> Posts
          </button>
          {isOwner && (
            <button className="flex items-center gap-2 py-4 border-t-2 border-transparent text-muted-foreground hover:text-foreground text-sm font-semibold tracking-widest uppercase transition-colors">
              <Bookmark className="w-4 h-4" /> Saved
            </button>
          )}
        </div>
      </div>

      {/* Posts Grid */}
      {isPostsLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : posts && posts.length > 0 ? (
        <div className="grid grid-cols-3 gap-1 md:gap-4 mt-4">
          {posts.map(post => (
            <div key={post.id} className="aspect-square relative group overflow-hidden bg-card rounded-md md:rounded-xl cursor-pointer">
              <img 
                src={post.image.startsWith('http') ? post.image : `/uploads/${post.image}`} 
                alt="Post" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold text-lg backdrop-blur-sm">
                <div className="flex items-center gap-2"><HeartIcon fill="currentColor"/> {post.likesCount}</div>
                <div className="flex items-center gap-2"><MessageCircleIcon fill="currentColor"/> {post.commentsCount}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <div className="w-24 h-24 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-6">
            <Camera className="w-10 h-10 text-border" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No Posts Yet</h3>
          <p>When you share photos, they will appear on your profile.</p>
        </div>
      )}
    </div>
  );
}

// Simple icons for grid hover state
function HeartIcon(props: any) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
}

function MessageCircleIcon(props: any) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinelinejoin="round" {...props}><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
}
