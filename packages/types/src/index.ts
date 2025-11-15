// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  avatar_color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT',
  ADMIN = 'ADMIN',
}

// Message types
export interface Message {
  id: string;
  content: string;
  authorId: string;
  chatRoomId: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  isModerated?: boolean;
}

// Chat room types
export interface ChatRoom {
  id: string;
  name: string;
  type: ChatRoomType;
  createdAt: Date;
  updatedAt: Date;
}

export enum ChatRoomType {
  CLASS = 'CLASS',
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
}

// Reaction types
export interface Reaction {
  id: number;
  message_id: number;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[]; // Array of user IDs who reacted
  hasReacted: boolean; // Whether current user has reacted with this emoji
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Notification types
export * from './notifications';
