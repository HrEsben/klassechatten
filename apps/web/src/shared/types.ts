// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
