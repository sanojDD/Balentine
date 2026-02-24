import { z } from 'zod';
import { insertUserSchema, insertPostSchema, insertCommentSchema, insertMessageSchema } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    signup: {
      method: 'POST' as const,
      path: '/api/auth/signup' as const,
      input: insertUserSchema,
      responses: {
        201: z.object({ token: z.string(), user: z.any() }), // user without password
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.object({ token: z.string(), user: z.any() }),
        401: errorSchemas.unauthorized,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
      },
    }
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users' as const,
      responses: {
        200: z.array(z.any()),
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/users/:id' as const,
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/users/:id' as const, // For updating bio/profile picture
      input: z.object({ bio: z.string().optional() }), // Profile picture handled via separate upload endpoint usually or FormData
      responses: {
        200: z.any(),
        401: errorSchemas.unauthorized,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/users/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized,
      }
    },
    ban: {
      method: 'PATCH' as const,
      path: '/api/users/:id/ban' as const,
      input: z.object({ isBanned: z.boolean() }),
      responses: {
        200: z.any(),
        403: errorSchemas.unauthorized,
      }
    },
    follow: {
      method: 'POST' as const,
      path: '/api/users/:id/follow' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
      }
    }
  },
  posts: {
    list: {
      method: 'GET' as const,
      path: '/api/posts' as const,
      input: z.object({ userId: z.string().optional(), feed: z.string().optional() }).optional(),
      responses: {
        200: z.array(z.any()),
      }
    },
    get: {
      method: 'GET' as const,
      path: '/api/posts/:id' as const,
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/posts/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized,
      }
    },
    like: {
      method: 'POST' as const,
      path: '/api/posts/:id/like' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
      }
    },
    comments: {
      list: {
        method: 'GET' as const,
        path: '/api/posts/:id/comments' as const,
        responses: {
          200: z.array(z.any()),
        }
      },
      create: {
        method: 'POST' as const,
        path: '/api/posts/:id/comments' as const,
        input: insertCommentSchema,
        responses: {
          201: z.any(),
          401: errorSchemas.unauthorized,
        }
      }
    }
  },
  comments: {
    delete: {
      method: 'DELETE' as const,
      path: '/api/comments/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        403: errorSchemas.unauthorized,
      }
    }
  },
  messages: {
    history: {
      method: 'GET' as const,
      path: '/api/messages/:userId' as const, // Get chat history with a specific user
      responses: {
        200: z.array(z.any()),
        401: errorSchemas.unauthorized,
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/messages/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export const ws = {
  send: {
    message: z.object({ receiverId: z.number(), content: z.string() }),
    typing: z.object({ receiverId: z.number(), isTyping: z.boolean() }),
  },
  receive: {
    message: z.object({ id: z.number(), senderId: z.number(), content: z.string(), createdAt: z.string() }),
    userStatus: z.object({ userId: z.number(), status: z.enum(['online', 'offline']) }),
  },
};
