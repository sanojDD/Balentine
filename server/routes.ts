import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Server as SocketIOServer } from "socket.io";

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: number; username: string; role: string };
    }
  }
}

// Multer setup for local uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploader = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  })
});

// Auth Middleware
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Authentication required' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Socket.io Setup
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' }
  });
  
  const connectedUsers = new Map<number, string>(); // userId -> socketId
  
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) return next(new Error('Authentication error'));
      socket.data.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user.id;
    connectedUsers.set(userId, socket.id);
    
    // Broadcast user online status
    io.emit('userStatus', { userId, status: 'online' });
    
    socket.on('sendMessage', async (data) => {
      const { receiverId, content } = data;
      try {
        const message = await storage.createMessage({
          senderId: userId,
          receiverId,
          content
        });
        
        const receiverSocketId = connectedUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message', message);
        }
        socket.emit('message', message); // send back to sender
      } catch (err) {
        console.error('Error sending message:', err);
      }
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(userId);
      io.emit('userStatus', { userId, status: 'offline' });
    });
  });

  // --- Auth Routes ---
  app.post(api.auth.signup.path, async (req, res) => {
    try {
      const input = api.auth.signup.input.parse(req.body);
      const existingUser = await storage.getUserByUsername(input.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists', field: 'username' });
      }
      
      const hashedPassword = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser({ ...input, password: hashedPassword });
      
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({ token, user: userWithoutPassword });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      if (user.isBanned) {
        return res.status(403).json({ message: 'This account has been banned' });
      }
      
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({ token, user: userWithoutPassword });
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get(api.auth.me.path, authenticateToken, async (req, res) => {
    const user = await storage.getUser(req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // --- User Routes ---
  app.get(api.users.list.path, authenticateToken, async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users.map(u => {
      const { password, ...userWithoutPassword } = u;
      return {
        ...userWithoutPassword,
        status: connectedUsers.has(u.id) ? 'online' : 'offline'
      };
    }));
  });

  app.get(api.users.get.path, authenticateToken, async (req, res) => {
    const targetUserId = parseInt(req.params.id);
    const user = await storage.getUser(targetUserId);
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const followersCount = await storage.getFollowersCount(targetUserId);
    const followingCount = await storage.getFollowingCount(targetUserId);
    const isFollowing = await storage.isFollowing(req.user!.id, targetUserId);
    
    const { password, ...userWithoutPassword } = user;
    res.json({
      ...userWithoutPassword,
      followersCount,
      followingCount,
      isFollowing,
      status: connectedUsers.has(user.id) ? 'online' : 'offline'
    });
  });

  app.put(api.users.update.path, authenticateToken, async (req, res) => {
    if (req.user!.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const { bio } = req.body;
    const updatedUser = await storage.updateUser(req.user!.id, bio);
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  });
  
  app.post('/api/users/:id/avatar', authenticateToken, uploader.single('avatar'), async (req, res) => {
    if (req.user!.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    const updatedUser = await storage.updateUser(req.user!.id, undefined, imageUrl);
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  });

  app.delete(api.users.delete.path, authenticateToken, async (req, res) => {
    const targetUserId = parseInt(req.params.id);
    if (req.user!.id !== targetUserId && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    await storage.deleteUser(targetUserId);
    res.status(204).send();
  });

  app.patch(api.users.ban.path, authenticateToken, requireAdmin, async (req, res) => {
    const { isBanned } = req.body;
    const user = await storage.banUser(parseInt(req.params.id), isBanned);
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post(api.users.follow.path, authenticateToken, async (req, res) => {
    const followingId = parseInt(req.params.id);
    if (req.user!.id === followingId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }
    const isNowFollowing = await storage.followUser(req.user!.id, followingId);
    res.json({ success: true, isFollowing: isNowFollowing });
  });

  // --- Post Routes ---
  app.post(api.posts.list.path, authenticateToken, uploader.single('image'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    const post = await storage.createPost({
      userId: req.user!.id,
      image: imageUrl,
      caption: req.body.caption || ''
    });
    res.status(201).json(post);
  });

  app.get(api.posts.list.path, authenticateToken, async (req, res) => {
    const { userId, feed } = req.query;
    let posts;
    if (userId) {
      posts = await storage.getPosts(parseInt(userId as string));
    } else if (feed === 'true') {
      posts = await storage.getPosts(undefined, req.user!.id);
    } else {
      posts = await storage.getPosts(); // all posts (explore)
    }
    res.json(posts);
  });

  app.delete(api.posts.delete.path, authenticateToken, async (req, res) => {
    const postId = parseInt(req.params.id);
    const post = await storage.getPost(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    if (post.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    await storage.deletePost(postId);
    res.status(204).send();
  });

  app.post(api.posts.like.path, authenticateToken, async (req, res) => {
    const postId = parseInt(req.params.id);
    const isNowLiked = await storage.likePost(req.user!.id, postId);
    res.json({ success: true, isLiked: isNowLiked });
  });

  // --- Comment Routes ---
  app.get(api.posts.comments.list.path, authenticateToken, async (req, res) => {
    const postId = parseInt(req.params.id);
    const comments = await storage.getCommentsByPost(postId);
    res.json(comments);
  });

  app.post(api.posts.comments.create.path, authenticateToken, async (req, res) => {
    const postId = parseInt(req.params.id);
    const { content } = req.body;
    
    if (!content) return res.status(400).json({ message: 'Content is required' });
    
    const comment = await storage.createComment({
      userId: req.user!.id,
      postId,
      content
    });
    
    // Fetch with user details for immediate display
    const user = await storage.getUser(req.user!.id);
    const { password, ...userWithoutPassword } = user!;
    
    res.status(201).json({ ...comment, user: userWithoutPassword });
  });

  app.delete(api.comments.delete.path, authenticateToken, async (req, res) => {
    const commentId = parseInt(req.params.id);
    const comment = await storage.getComment(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    
    if (comment.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    await storage.deleteComment(commentId);
    res.status(204).send();
  });

  // --- Message Routes ---
  app.get(api.messages.history.path, authenticateToken, async (req, res) => {
    const otherUserId = parseInt(req.params.userId);
    const messages = await storage.getMessagesBetweenUsers(req.user!.id, otherUserId);
    res.json(messages);
  });

  app.delete(api.messages.delete.path, authenticateToken, async (req, res) => {
    const messageId = parseInt(req.params.id);
    const message = await storage.getMessage(messageId);
    
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (message.senderId !== req.user!.id) {
      return res.status(403).json({ message: 'Only sender can delete message' });
    }
    
    await storage.deleteMessage(messageId);
    
    // Notify clients about deletion if needed
    const receiverSocketId = connectedUsers.get(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('messageDeleted', { id: messageId });
    }
    
    res.status(204).send();
  });

  // Seed Admin User
  const seedAdmin = async () => {
    const adminExists = await storage.getUserByUsername('admin');
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await storage.createUser({
        username: 'admin',
        password: hashedPassword,
        bio: 'System Administrator',
        role: 'admin'
      });
      console.log('Admin user seeded (admin / admin123)');
    }
  };
  
  seedAdmin().catch(console.error);

  return httpServer;
}
