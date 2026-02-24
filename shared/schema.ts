import { pgTable, text, serial, boolean, timestamp, integer, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  bio: text("bio"),
  profilePicture: text("profile_picture"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  isBanned: boolean("is_banned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const follows = pgTable("follows", {
  followerId: integer("follower_id").notNull(),
  followingId: integer("following_id").notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.followerId, t.followingId] }),
}));

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  image: text("image").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const likes = pgTable("likes", {
  userId: integer("user_id").notNull(),
  postId: integer("post_id").notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.postId] }),
}));

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  postId: integer("post_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  likes: many(likes),
  followers: many(follows, { relationName: "following" }),
  following: many(follows, { relationName: "follower" }),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, { fields: [posts.userId], references: [users.id] }),
  comments: many(comments),
  likes: many(likes),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, { fields: [likes.userId], references: [users.id] }),
  post: one(posts, { fields: [likes.postId], references: [posts.id] }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, { fields: [follows.followerId], references: [users.id], relationName: "follower" }),
  following: one(users, { fields: [follows.followingId], references: [users.id], relationName: "following" }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id], relationName: "sentMessages" }),
  receiver: one(users, { fields: [messages.receiverId], references: [users.id], relationName: "receivedMessages" }),
}));

// Base Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, role: true, isBanned: true, createdAt: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, userId: true, createdAt: true, image: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, userId: true, postId: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, senderId: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Like = typeof likes.$inferSelect;
export type Follow = typeof follows.$inferSelect;

export type UserProfile = Omit<User, 'password'> & {
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
};

export type PostWithDetails = Post & {
  user: Omit<User, 'password'>;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
};

export type CommentWithUser = Comment & {
  user: Omit<User, 'password'>;
};
