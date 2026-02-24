import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, MoreHorizontal, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLikePost, useDeletePost, useAddComment, usePostComments } from "@/hooks/use-posts";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { PostWithDetails } from "@shared/schema";

interface PostCardProps {
  post: PostWithDetails;
}

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const { mutate: likePost } = useLikePost();
  const { mutate: deletePost } = useDeletePost();
  const { mutate: addComment, isPending: isCommenting } = useAddComment();
  const { data: comments = [] } = usePostComments(post.id);
  
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  
  const isOwner = user?.id === post.userId;
  const isAdmin = user?.role === 'admin';

  const handleLike = () => {
    likePost(post.id);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment({ postId: post.id, content: commentText }, {
      onSuccess: () => setCommentText("")
    });
  };

  return (
    <article className="bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden mb-8 transition-all hover:border-border">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <Link href={`/profile/${post.userId}`} className="flex items-center gap-3 group cursor-pointer">
          <Avatar className="w-10 h-10 border-2 border-transparent group-hover:border-primary transition-all">
            <AvatarImage src={post.user.profilePicture ? `/uploads/${post.user.profilePicture}` : undefined} />
            <AvatarFallback>{post.user.username.substring(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{post.user.username}</h3>
            <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
          </div>
        </Link>
        
        {(isOwner || isAdmin) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border-border">
              <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer" onClick={() => deletePost(post.id)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Image */}
      <div className="w-full bg-black flex items-center justify-center overflow-hidden max-h-[600px]">
        {/* We assume images are served at /uploads/:filename */}
        <img 
          src={post.image.startsWith('http') ? post.image : `/uploads/${post.image}`} 
          alt="Post content" 
          className="w-full h-auto object-cover"
          loading="lazy"
        />
      </div>

      {/* Actions */}
      <div className="p-4 pb-2 flex items-center gap-4">
        <button 
          onClick={handleLike} 
          className={`flex items-center gap-2 group transition-all duration-300 active:scale-90 ${post.isLiked ? 'text-destructive' : 'text-foreground'}`}
        >
          <Heart className={`w-7 h-7 transition-colors ${post.isLiked ? 'fill-current' : 'group-hover:text-muted-foreground'}`} />
        </button>
        <button 
          onClick={() => setShowComments(!showComments)} 
          className="flex items-center gap-2 group transition-all duration-300 active:scale-90"
        >
          <MessageCircle className="w-7 h-7 group-hover:text-muted-foreground" />
        </button>
      </div>

      {/* Likes Count */}
      <div className="px-4 font-semibold text-sm">
        {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="px-4 py-2 text-sm">
          <span className="font-semibold mr-2">{post.user.username}</span>
          <span className="text-foreground/90 leading-relaxed">{post.caption}</span>
        </div>
      )}

      {/* Comments Preview / Toggle */}
      <div className="px-4 pb-4">
        {post.commentsCount > 0 && !showComments && (
          <button 
            onClick={() => setShowComments(true)}
            className="text-sm text-muted-foreground mt-1 hover:text-foreground transition-colors"
          >
            View all {post.commentsCount} comments
          </button>
        )}

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {comments.map(comment => (
              <div key={comment.id} className="text-sm flex gap-2">
                <span className="font-semibold">{comment.user.username}</span>
                <span className="text-foreground/80">{comment.content}</span>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">No comments yet. Be the first!</p>
            )}
          </div>
        )}

        {/* Add Comment Input */}
        <form onSubmit={handleCommentSubmit} className="mt-4 flex items-center gap-3 border-t border-border/50 pt-4">
          <input 
            type="text" 
            placeholder="Add a comment..." 
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm placeholder:text-muted-foreground"
          />
          <button 
            type="submit" 
            disabled={!commentText.trim() || isCommenting}
            className="text-primary font-semibold text-sm disabled:opacity-50 transition-opacity hover:text-primary/80"
          >
            Post
          </button>
        </form>
      </div>
    </article>
  );
}
