import { GET } from '@/app/api/moderation/flagged-messages/route';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// Mock Supabase
jest.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('Class Admin Moderation API', () => {
  const mockSupabaseAdmin = supabaseAdmin as jest.Mocked<typeof supabaseAdmin>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission Checks', () => {
    describe('Full Admin Access', () => {
      it('should allow full admin to access flagged messages without classId', async () => {
        const mockUser = { id: 'admin-user-123' };
        const mockProfile = { role: 'admin' };
        const mockFlaggedMessages = [
          {
            id: '1',
            subject_id: '100',
            class_id: 'class-1',
            status: 'flagged',
            severity: 'high_severity',
            rule: 'sexual',
            score: 0.95,
            labels: ['sexual'],
            created_at: new Date().toISOString(),
            messages: {
              id: 100,
              body: 'inappropriate content',
              user_id: 'user-1',
              room_id: 'room-1',
              created_at: new Date().toISOString(),
              profiles: {
                user_id: 'user-1',
                display_name: 'John Doe',
                avatar_url: null,
                avatar_color: '#6247f5',
              },
            },
          },
        ];

        mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
          data: { user: mockUser as any },
          error: null,
        });

        mockSupabaseAdmin.from.mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValueOnce({
                data: mockProfile,
                error: null,
              }),
            } as any;
          }
          if (table === 'moderation_events') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockResolvedValueOnce({
                data: mockFlaggedMessages,
                error: null,
              }),
            } as any;
          }
        });

        const request = new NextRequest(
          new URL('http://localhost:3000/api/moderation/flagged-messages'),
          {
            headers: {
              authorization: 'Bearer mock-token',
            },
          }
        );

        const response = await GET(request);
        expect(response.status).toBe(200);
      });

      it('should allow full admin to access flagged messages from specific class', async () => {
        const mockUser = { id: 'admin-user-123' };
        const mockProfile = { role: 'admin' };

        mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
          data: { user: mockUser as any },
          error: null,
        });

        mockSupabaseAdmin.from.mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValueOnce({
                data: mockProfile,
                error: null,
              }),
            } as any;
          }
          if (table === 'moderation_events') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockResolvedValueOnce({
                data: [],
                error: null,
              }),
            } as any;
          }
        });

        const request = new NextRequest(
          new URL('http://localhost:3000/api/moderation/flagged-messages?class_id=class-123'),
          {
            headers: {
              authorization: 'Bearer mock-token',
            },
          }
        );

        const response = await GET(request);
        expect(response.status).toBe(200);
      });
    });

    describe('Class Admin Access', () => {
      it('should allow class admin to access moderation for their class', async () => {
        const mockUser = { id: 'teacher-user-123' };
        const mockProfile = { role: 'adult' };
        const classId = 'class-456';
        const mockClassMember = { is_class_admin: true };

        mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
          data: { user: mockUser as any },
          error: null,
        });

        let callCount = 0;
        mockSupabaseAdmin.from.mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValueOnce({
                data: mockProfile,
                error: null,
              }),
            } as any;
          }
          if (table === 'class_members') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValueOnce({
                data: mockClassMember,
                error: null,
              }),
            } as any;
          }
          if (table === 'moderation_events') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockResolvedValueOnce({
                data: [],
                error: null,
              }),
            } as any;
          }
        });

        const request = new NextRequest(
          new URL(`http://localhost:3000/api/moderation/flagged-messages?class_id=${classId}`),
          {
            headers: {
              authorization: 'Bearer mock-token',
            },
          }
        );

        const response = await GET(request);
        expect(response.status).toBe(200);
      });

      it('should deny class admin access without classId parameter', async () => {
        const mockUser = { id: 'teacher-user-123' };
        const mockProfile = { role: 'adult' };

        mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
          data: { user: mockUser as any },
          error: null,
        });

        mockSupabaseAdmin.from.mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValueOnce({
                data: mockProfile,
                error: null,
              }),
            } as any;
          }
        });

        const request = new NextRequest(
          new URL('http://localhost:3000/api/moderation/flagged-messages'),
          {
            headers: {
              authorization: 'Bearer mock-token',
            },
          }
        );

        const response = await GET(request);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('Class ID required');
      });

      it('should deny class admin access to different class', async () => {
        const mockUser = { id: 'teacher-user-123' };
        const mockProfile = { role: 'adult' };
        const classId = 'class-789';
        const mockClassMember = { is_class_admin: false };

        mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
          data: { user: mockUser as any },
          error: null,
        });

        mockSupabaseAdmin.from.mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValueOnce({
                data: mockProfile,
                error: null,
              }),
            } as any;
          }
          if (table === 'class_members') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValueOnce({
                data: mockClassMember,
                error: null,
              }),
            } as any;
          }
        });

        const request = new NextRequest(
          new URL(`http://localhost:3000/api/moderation/flagged-messages?class_id=${classId}`),
          {
            headers: {
              authorization: 'Bearer mock-token',
            },
          }
        );

        const response = await GET(request);
        expect(response.status).toBe(403);
      });

      it('should accept both classId and class_id parameter names', async () => {
        const mockUser = { id: 'admin-user-123' };
        const mockProfile = { role: 'admin' };

        mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
          data: { user: mockUser as any },
          error: null,
        });

        mockSupabaseAdmin.from.mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValueOnce({
                data: mockProfile,
                error: null,
              }),
            } as any;
          }
          if (table === 'moderation_events') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockResolvedValueOnce({
                data: [],
                error: null,
              }),
            } as any;
          }
        });

        // Test with classId
        const request1 = new NextRequest(
          new URL('http://localhost:3000/api/moderation/flagged-messages?classId=class-123'),
          {
            headers: {
              authorization: 'Bearer mock-token',
            },
          }
        );

        const response1 = await GET(request1);
        expect(response1.status).toBe(200);

        // Test with class_id
        const request2 = new NextRequest(
          new URL('http://localhost:3000/api/moderation/flagged-messages?class_id=class-123'),
          {
            headers: {
              authorization: 'Bearer mock-token',
            },
          }
        );

        const response2 = await GET(request2);
        expect(response2.status).toBe(200);
      });
    });

    describe('Parent Access', () => {
      it('should allow parent to access child messages without classId', async () => {
        const mockUser = { id: 'parent-user-123' };
        const mockProfile = { role: 'guardian' };

        mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
          data: { user: mockUser as any },
          error: null,
        });

        mockSupabaseAdmin.from.mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValueOnce({
                data: mockProfile,
                error: null,
              }),
            } as any;
          }
          if (table === 'guardian_links') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValueOnce({
                data: [{ child_user_id: 'child-1' }],
                error: null,
              }),
            } as any;
          }
          if (table === 'moderation_events') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              in: jest.fn().mockReturnThis(),
              order: jest.fn().mockResolvedValueOnce({
                data: [],
                error: null,
              }),
            } as any;
          }
        });

        const request = new NextRequest(
          new URL('http://localhost:3000/api/moderation/flagged-messages'),
          {
            headers: {
              authorization: 'Bearer mock-token',
            },
          }
        );

        const response = await GET(request);
        expect(response.status).toBe(200);
      });

      it('should return empty array when parent has no children', async () => {
        const mockUser = { id: 'parent-user-123' };
        const mockProfile = { role: 'guardian' };

        mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
          data: { user: mockUser as any },
          error: null,
        });

        mockSupabaseAdmin.from.mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValueOnce({
                data: mockProfile,
                error: null,
              }),
            } as any;
          }
          if (table === 'guardian_links') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValueOnce({
                data: [],
                error: null,
              }),
            } as any;
          }
        });

        const request = new NextRequest(
          new URL('http://localhost:3000/api/moderation/flagged-messages'),
          {
            headers: {
              authorization: 'Bearer mock-token',
            },
          }
        );

        const response = await GET(request);
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.flagged_messages).toEqual([]);
      });
    });

    describe('Student Access', () => {
      it('should deny student access to moderation', async () => {
        const mockUser = { id: 'student-user-123' };
        const mockProfile = { role: 'child' };

        mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
          data: { user: mockUser as any },
          error: null,
        });

        mockSupabaseAdmin.from.mockImplementation((table: string) => {
          if (table === 'profiles') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValueOnce({
                data: mockProfile,
                error: null,
              }),
            } as any;
          }
        });

        const request = new NextRequest(
          new URL('http://localhost:3000/api/moderation/flagged-messages'),
          {
            headers: {
              authorization: 'Bearer mock-token',
            },
          }
        );

        const response = await GET(request);
        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toContain('Insufficient permissions');
      });
    });
  });

  describe('Authentication', () => {
    it('should deny request without authorization header', async () => {
      const request = new NextRequest(
        new URL('http://localhost:3000/api/moderation/flagged-messages')
      );

      const response = await GET(request);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Unauthorized');
    });

    it('should deny request with invalid token', async () => {
      mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('Invalid token'),
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/moderation/flagged-messages'),
        {
          headers: {
            authorization: 'Bearer invalid-token',
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should deny request when profile not found', async () => {
      const mockUser = { id: 'unknown-user-123' };

      mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser as any },
        error: null,
      });

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValueOnce({
              data: null,
              error: new Error('Profile not found'),
            }),
          } as any;
        }
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/moderation/flagged-messages'),
        {
          headers: {
            authorization: 'Bearer mock-token',
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Profile not found');
    });
  });

  describe('Query Parameters', () => {
    it('should filter by severity when provided', async () => {
      const mockUser = { id: 'admin-user-123' };
      const mockProfile = { role: 'admin' };

      mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser as any },
        error: null,
      });

      const eqMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValueOnce({
        data: [],
        error: null,
      });

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValueOnce({
              data: mockProfile,
              error: null,
            }),
          } as any;
        }
        if (table === 'moderation_events') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: eqMock,
            order: orderMock,
          } as any;
        }
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/moderation/flagged-messages?severity=high_severity'),
        {
          headers: {
            authorization: 'Bearer mock-token',
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);
      expect(eqMock).toHaveBeenCalledWith('severity', 'high_severity');
    });

    it('should handle multiple query parameters', async () => {
      const mockUser = { id: 'admin-user-123' };
      const mockProfile = { role: 'admin' };

      mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser as any },
        error: null,
      });

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValueOnce({
              data: mockProfile,
              error: null,
            }),
          } as any;
        }
        if (table === 'moderation_events') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValueOnce({
              data: [],
              error: null,
            }),
          } as any;
        }
      });

      const request = new NextRequest(
        new URL(
          'http://localhost:3000/api/moderation/flagged-messages?class_id=class-123&severity=high_severity'
        ),
        {
          headers: {
            authorization: 'Bearer mock-token',
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockUser = { id: 'admin-user-123' };
      const mockProfile = { role: 'admin' };

      mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser as any },
        error: null,
      });

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValueOnce({
              data: mockProfile,
              error: null,
            }),
          } as any;
        }
        if (table === 'moderation_events') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValueOnce({
              data: null,
              error: new Error('Database connection failed'),
            }),
          } as any;
        }
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/moderation/flagged-messages'),
        {
          headers: {
            authorization: 'Bearer mock-token',
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should handle missing class_members record', async () => {
      const mockUser = { id: 'teacher-user-123' };
      const mockProfile = { role: 'adult' };

      mockSupabaseAdmin.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser as any },
        error: null,
      });

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValueOnce({
              data: mockProfile,
              error: null,
            }),
          } as any;
        }
        if (table === 'class_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValueOnce({
              data: null,
              error: new Error('No rows returned'),
            }),
          } as any;
        }
      });

      const request = new NextRequest(
        new URL('http://localhost:3000/api/moderation/flagged-messages?class_id=class-456'),
        {
          headers: {
            authorization: 'Bearer mock-token',
          },
        }
      );

      const response = await GET(request);
      expect(response.status).toBe(403);
    });
  });
});
