import { db } from "./db";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { 
  users, posts, comments, likes, follows, messages,
  type User, type InsertUser, type Post, type InsertPost,
  type Comment, type InsertComment, type Message, type InsertMessage,
  type Like, type Follow, type UserProfile, type PostWithDetails, type CommentWithUser
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, bio?: string, profilePicture?: string): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  banUser(id: number, isBanned: boolean): Promise<User>;

  // Follows
  followUser(followerId: number, followingId: number): Promise<boolean>;
  getFollowersCount(userId: number): Promise<number>;
  getFollowingCount(userId: number): Promise<number>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;

  // Posts
  createPost(post: InsertPost): Promise<Post>;
  getPost(id: number): Promise<Post | undefined>;
  getPosts(userId?: number, feedUserId?: number): Promise<PostWithDetails[]>;
  deletePost(id: number): Promise<void>;

  // Likes
  likePost(userId: number, postId: number): Promise<boolean>;
  getLikesCount(postId: number): Promise<number>;
  hasLiked(userId: number, postId: number): Promise<boolean>;

  // Comments
  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByPost(postId: number): Promise<CommentWithUser[]>;
  deleteComment(id: number): Promise<void>;
  getComment(id: number): Promise<Comment | undefined>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBetweenUsers(userId1: number, userId2: number): Promise<Message[]>;
  deleteMessage(id: number): Promise<void>;
  getMessage(id: number): Promise<Message | undefined>;
}

export class DatabaseStorage implements IStorage {
  // --- Users ---
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, bio?: string, profilePicture?: string): Promise<User> {
    const updates: Partial<User> = {};
    if (bio !== undefined) updates.bio = bio;
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;
    
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async banUser(id: number, isBanned: boolean): Promise<User> {
    const [user] = await db.update(users).set({ isBanned }).where(eq(users.id, id)).returning();
    return user;
  }

  // --- Follows ---
  async followUser(followerId: number, followingId: number): Promise<boolean> {
    const existing = await db.select().from(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    if (existing.length > 0) {
      await db.delete(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
      return false; // Unfollowed
    } else {
      await db.insert(follows).values({ followerId, followingId });
      return true; // Followed
    }
  }

  async getFollowersCount(userId: number): Promise<number> {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(follows).where(eq(follows.followingId, userId));
    return Number(count);
  }

  async getFollowingCount(userId: number): Promise<number> {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(follows).where(eq(follows.followerId, userId));
    return Number(count);
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const existing = await db.select().from(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return existing.length > 0;
  }

  // --- Posts ---
  async createPost(post: InsertPost): Promise<Post> {
    const [created] = await db.insert(posts).values(post).returning();
    return created;
  }

  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async getPosts(userId?: number, feedUserId?: number): Promise<PostWithDetails[]> {
    let query = db.select().from(posts).orderBy(desc(posts.createdAt));
    
    if (userId) {
      query = db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt)) as any;
    } else if (feedUserId) {
      // Get posts from self and followed users
      const followingIds = await db.select({ followingId: follows.followingId }).from(follows).where(eq(follows.followerId, feedUserId));
      const ids = [feedUserId, ...followingIds.map(f => f.followingId)];
      if (ids.length > 0) {
        query = db.select().from(posts).where(sql`${posts.userId} IN ${ids}`).orderBy(desc(posts.createdAt)) as any;
      } else {
        query = db.select().from(posts).where(eq(posts.userId, feedUserId)).orderBy(desc(posts.createdAt)) as any;
      }
    }

    const fetchedPosts = await query;
    const postsWithDetails: PostWithDetails[] = [];

    for (const post of fetchedPosts) {
      const user = await this.getUser(post.userId);
      const likesCount = await this.getLikesCount(post.id);
      const [{ count: commentsCount }] = await db.select({ count: sql<number>`count(*)` }).from(comments).where(eq(comments.postId, post.id));
      
      let isLiked = false;
      if (feedUserId) {
        isLiked = await this.hasLiked(feedUserId, post.id);
      }

      if (user) {
        const { password, ...userWithoutPassword } = user;
        postsWithDetails.push({
          ...post,
          user: userWithoutPassword,
          likesCount,
          commentsCount: Number(commentsCount),
          isLiked
        });
      }
    }

    return postsWithDetails;
  }

  async deletePost(id: number): Promise<void> {
    await db.delete(posts).where(eq(posts.id, id));
  }

  // --- Likes ---
  async likePost(userId: number, postId: number): Promise<boolean> {
    const existing = await db.select().from(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    if (existing.length > 0) {
      await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
      return false; // Unliked
    } else {
      await db.insert(likes).values({ userId, postId });
      return true; // Liked
    }
  }

  async getLikesCount(postId: number): Promise<number> {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(likes).where(eq(likes.postId, postId));
    return Number(count);
  }

  async hasLiked(userId: number, postId: number): Promise<boolean> {
    const existing = await db.select().from(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId)));
    return existing.length > 0;
  }

  // --- Comments ---
  async createComment(comment: InsertComment): Promise<Comment> {
    const [created] = await db.insert(comments).values(comment).returning();
    return created;
  }

  async getCommentsByPost(postId: number): Promise<CommentWithUser[]> {
    const fetchedComments = await db.select().from(comments).where(eq(comments.postId, postId)).orderBy(comments.createdAt);
    const commentsWithUser: CommentWithUser[] = [];
    
    for (const comment of fetchedComments) {
      const user = await this.getUser(comment.userId);
      if (user) {
        const { password, ...userWithoutPassword } = user;
        commentsWithUser.push({
          ...comment,
          user: userWithoutPassword
        });
      }
    }
    
    return commentsWithUser;
  }

  async deleteComment(id: number): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }
  
  async getComment(id: number): Promise<Comment | undefined> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment;
  }

  // --- Messages ---
  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async getMessagesBetweenUsers(userId1: number, userId2: number): Promise<Message[]> {
    return await db.select().from(messages).where(
      or(
        and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
      )
    ).orderBy(messages.createdAt);
  }

  async deleteMessage(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }
  
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }
}

export const storage = new DatabaseStorage();
