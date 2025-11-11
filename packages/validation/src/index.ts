import { z } from 'zod';
import { UserRole, ChatRoomType } from '@klassechatten/types';

// User validation schemas
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.nativeEnum(UserRole),
  password: z.string().min(8).max(100),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Message validation schemas
export const createMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  chatRoomId: z.string().uuid(),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

// Chat room validation schemas
export const createChatRoomSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.nativeEnum(ChatRoomType),
  memberIds: z.array(z.string().uuid()).optional(),
});

export const updateChatRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// Moderation schemas
export const moderationActionSchema = z.object({
  messageId: z.string().uuid(),
  action: z.enum(['approve', 'reject', 'flag']),
  reason: z.string().max(500).optional(),
});

// Export types inferred from schemas
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type CreateChatRoomInput = z.infer<typeof createChatRoomSchema>;
export type UpdateChatRoomInput = z.infer<typeof updateChatRoomSchema>;
export type ModerationActionInput = z.infer<typeof moderationActionSchema>;
