import { GET } from '@/app/api/moderation/flagged-messages/route';
import { NextRequest } from 'next/server';

// Mock Supabase client
jest.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase-server';

describe('GET /api/moderation/flagged-messages', () => {
  let mockRequest: Partial<NextRequest>;
  let mockSelect: jest.Mock;
  let mockFilter: jest.Mock;
  let mockFrom: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSelect = jest.fn();
    mockFilter = jest.fn();
    mockFrom = jest.fn();

    (supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: mockSelect.mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    });
  });

  describe('Authentication', () => {
    it('should reject requests without Authorization header', async () => {
      mockRequest = {
        headers: new Headers(),
      };

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid token format', async () => {
      mockRequest = {
        headers: new Headers({
          Authorization: 'InvalidFormat token',
        }),
      };

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(401);
    });

    it('should extract bearer token correctly', async () => {
      (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: {
          user: {
            id: 'user-123',
            user_metadata: { role: 'admin' },
          },
        },
        error: null,
      });

      mockSelect.mockResolvedValueOnce({
        data: [{ role: 'admin' }],
        error: null,
      });

      mockRequest = {
        headers: new Headers({
          Authorization: 'Bearer valid-token-123',
        }),
      };

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(200);
    });
  });

  describe('Permission Checks - Admin/Teacher', () => {
    beforeEach(() => {
      (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'admin-user-1',
            user_metadata: { role: 'admin' },
          },
        },
        error: null,
      });

      mockSelect.mockResolvedValue({
        data: [{ role: 'admin' }],
        error: null,
      });

      mockRequest = {
        headers: new Headers({
          Authorization: 'Bearer admin-token',
        }),
      };
    });

    it('should allow admin to see all flagged messages', async () => {
      const mockFlaggedMessages = [
        {
          id: 'event-1',
          subject_type: 'message',
          subject_id: 123,
          class_id: 'class-1',
          severity: 'high_severity',
          labels: ['sexual'],
          rule: 'sexual/minors',
          score: 0.95,
          created_at: '2025-11-18T10:30:00Z',
          message: {
            id: 123,
            body: 'Message 1',
            user_id: 'student-1',
            created_at: '2025-11-18T10:30:00Z',
          },
          author: {
            user_id: 'student-1',
            display_name: 'Student 1',
            avatar_color: '#ff3fa4',
          },
        },
      ];

      mockSelect.mockResolvedValueOnce({
        data: mockFlaggedMessages,
        error: null,
      });

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.flagged_messages).toBeDefined();
    });

    it('should return flagged messages with context data', async () => {
      const mockFlaggedMessages = [
        {
          id: 'event-1',
          subject_type: 'message',
          subject_id: 123,
          class_id: 'class-1',
          severity: 'high_severity',
          labels: ['sexual'],
          rule: 'sexual/minors',
          score: 0.95,
          created_at: '2025-11-18T10:30:00Z',
        },
      ];

      mockSelect.mockResolvedValueOnce({
        data: mockFlaggedMessages,
        error: null,
      });

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.flagged_messages[0]).toHaveProperty('severity');
      expect(data.flagged_messages[0]).toHaveProperty('labels');
      expect(data.flagged_messages[0]).toHaveProperty('rule');
    });
  });

  describe('Permission Checks - Parent/Guardian', () => {
    beforeEach(() => {
      (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'parent-user-1',
            user_metadata: { role: 'guardian' },
          },
        },
        error: null,
      });

      mockSelect.mockResolvedValue({
        data: [{ role: 'guardian' }],
        error: null,
      });

      mockRequest = {
        headers: new Headers({
          Authorization: 'Bearer parent-token',
        }),
      };
    });

    it('should filter messages to only show children messages for parents', async () => {
      // Mock guardian_links query to get child IDs
      let queryCount = 0;
      (supabaseAdmin.from as jest.Mock).mockImplementation((table) => {
        queryCount++;

        if (table === 'guardian_links') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest
              .fn()
              .mockResolvedValueOnce({
                data: [
                  { child_user_id: 'child-1' },
                  { child_user_id: 'child-2' },
                ],
                error: null,
              })
              .mockReturnThis(),
          };
        }

        if (table === 'moderation_events') {
          return {
            select: jest
              .fn()
              .mockReturnThis(),
            eq: jest
              .fn()
              .mockReturnThis(),
            in: jest
              .fn()
              .mockResolvedValueOnce({
                data: [
                  {
                    id: 'event-1',
                    subject_id: 123,
                    class_id: 'class-1',
                    severity: 'high_severity',
                    labels: ['hate'],
                    rule: 'hate/threatening',
                    score: 0.87,
                    created_at: '2025-11-18T10:30:00Z',
                  },
                ],
                error: null,
              })
              .mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
          };
        }
      });

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(200);
      expect(supabaseAdmin.from).toHaveBeenCalledWith('guardian_links');
    });

    it('should not allow parent to see other parents children messages', async () => {
      // This is enforced by the in() filter with only their own child IDs
      (supabaseAdmin.from as jest.Mock).mockImplementation((table) => {
        if (table === 'guardian_links') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest
              .fn()
              .mockResolvedValueOnce({
                data: [{ child_user_id: 'child-1' }], // Only this parent's child
                error: null,
              })
              .mockReturnThis(),
          };
        }

        if (table === 'moderation_events') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest
              .fn()
              .mockImplementationOnce((column, childIds) => {
                // Verify only their children are included
                expect(childIds).toEqual(['child-1']);
                return {
                  order: jest.fn().mockReturnThis(),
                  limit: jest.fn().mockReturnThis(),
                  mockResolvedValueOnce: jest
                    .fn()
                    .mockResolvedValueOnce({
                      data: [],
                      error: null,
                    })
                    .mockReturnThis(),
                };
              })
              .mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
          };
        }
      });

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(200);
    });
  });

  describe('Severity Filtering', () => {
    beforeEach(() => {
      (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'admin-user-1',
            user_metadata: { role: 'admin' },
          },
        },
        error: null,
      });

      mockSelect.mockResolvedValue({
        data: [{ role: 'admin' }],
        error: null,
      });

      mockRequest = {
        headers: new Headers({
          Authorization: 'Bearer admin-token',
        }),
      };
    });

    it('should filter by high_severity when specified', async () => {
      mockRequest.nextUrl = new URL(
        'http://localhost:3000/api/moderation/flagged-messages?severity=high_severity'
      );

      mockSelect.mockResolvedValueOnce({
        data: [
          {
            id: 'event-1',
            subject_type: 'message',
            subject_id: 123,
            class_id: 'class-1',
            severity: 'high_severity',
            labels: ['sexual'],
            rule: 'sexual/minors',
            score: 0.95,
            created_at: '2025-11-18T10:30:00Z',
          },
        ],
        error: null,
      });

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(200);
    });

    it('should filter by moderate_severity when specified', async () => {
      mockRequest.nextUrl = new URL(
        'http://localhost:3000/api/moderation/flagged-messages?severity=moderate_severity'
      );

      mockSelect.mockResolvedValueOnce({
        data: [
          {
            id: 'event-1',
            subject_type: 'message',
            subject_id: 123,
            class_id: 'class-1',
            severity: 'moderate_severity',
            labels: ['hate'],
            rule: 'hate/threatening',
            score: 0.6,
            created_at: '2025-11-18T10:30:00Z',
          },
        ],
        error: null,
      });

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(200);
    });

    it('should return all severities when no filter specified', async () => {
      mockRequest.nextUrl = new URL(
        'http://localhost:3000/api/moderation/flagged-messages'
      );

      mockSelect.mockResolvedValueOnce({
        data: [
          {
            id: 'event-1',
            subject_type: 'message',
            subject_id: 123,
            class_id: 'class-1',
            severity: 'high_severity',
            labels: [],
            rule: 'test',
            score: 0.9,
            created_at: '2025-11-18T10:30:00Z',
          },
          {
            id: 'event-2',
            subject_type: 'message',
            subject_id: 124,
            class_id: 'class-1',
            severity: 'low_severity',
            labels: [],
            rule: 'test',
            score: 0.3,
            created_at: '2025-11-18T10:35:00Z',
          },
        ],
        error: null,
      });

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.flagged_messages.length).toBe(2);
    });
  });

  describe('Message Context Retrieval', () => {
    beforeEach(() => {
      (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'admin-user-1',
            user_metadata: { role: 'admin' },
          },
        },
        error: null,
      });

      mockSelect.mockResolvedValue({
        data: [{ role: 'admin' }],
        error: null,
      });

      mockRequest = {
        headers: new Headers({
          Authorization: 'Bearer admin-token',
        }),
      };
    });

    it('should include context messages (before and after)', async () => {
      mockSelect.mockResolvedValueOnce({
        data: [
          {
            event_id: 'event-1',
            message_id: 123,
            class_id: 'class-1',
            severity: 'high_severity',
            labels: ['sexual'],
            rule: 'sexual/minors',
            score: 0.95,
            created_at: '2025-11-18T10:30:00Z',
            message: {
              id: 123,
              body: 'Flagged message',
              user_id: 'student-1',
              created_at: '2025-11-18T10:30:00Z',
              author: {
                user_id: 'student-1',
                display_name: 'Student',
                avatar_color: '#ff3fa4',
              },
            },
            context: {
              before: [
                {
                  id: 121,
                  body: 'Message before',
                  user_id: 'student-2',
                  created_at: '2025-11-18T10:28:00Z',
                  author: {
                    user_id: 'student-2',
                    display_name: 'Other Student',
                    avatar_color: '#6247f5',
                  },
                },
              ],
              after: [
                {
                  id: 124,
                  body: 'Message after',
                  user_id: 'student-2',
                  created_at: '2025-11-18T10:32:00Z',
                  author: {
                    user_id: 'student-2',
                    display_name: 'Other Student',
                    avatar_color: '#6247f5',
                  },
                },
              ],
            },
          },
        ],
        error: null,
      });

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.flagged_messages[0].context).toBeDefined();
      expect(data.flagged_messages[0].context.before).toHaveLength(1);
      expect(data.flagged_messages[0].context.after).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on database error', async () => {
      (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'admin-user-1',
            user_metadata: { role: 'admin' },
          },
        },
        error: null,
      });

      mockSelect.mockResolvedValueOnce({
        data: [{ role: 'admin' }],
        error: null,
      });

      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      });

      mockRequest = {
        headers: new Headers({
          Authorization: 'Bearer admin-token',
        }),
      };

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should handle user lookup failure', async () => {
      (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      mockRequest = {
        headers: new Headers({
          Authorization: 'Bearer invalid-token',
        }),
      };

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(401);
    });
  });

  describe('Response Format', () => {
    beforeEach(() => {
      (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'admin-user-1',
            user_metadata: { role: 'admin' },
          },
        },
        error: null,
      });

      mockSelect.mockResolvedValue({
        data: [{ role: 'admin' }],
        error: null,
      });

      mockRequest = {
        headers: new Headers({
          Authorization: 'Bearer admin-token',
        }),
      };
    });

    it('should return data under flagged_messages key', async () => {
      mockSelect.mockResolvedValueOnce({
        data: [
          {
            event_id: 'event-1',
            message_id: 123,
            class_id: 'class-1',
            severity: 'high_severity',
            labels: [],
            rule: 'test',
            score: 0.8,
            created_at: '2025-11-18T10:30:00Z',
            message: {
              id: 123,
              body: 'Test',
              user_id: 'student-1',
              created_at: '2025-11-18T10:30:00Z',
            },
            author: {
              user_id: 'student-1',
              display_name: 'Student',
              avatar_color: '#ff3fa4',
            },
          },
        ],
        error: null,
      });

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('flagged_messages');
      expect(Array.isArray(data.flagged_messages)).toBe(true);
    });

    it('should return empty array when no flagged messages', async () => {
      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.flagged_messages).toEqual([]);
    });
  });

  describe('Query Parameters', () => {
    it('should accept severity parameter', async () => {
      (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'admin-user-1',
            user_metadata: { role: 'admin' },
          },
        },
        error: null,
      });

      mockSelect.mockResolvedValue({
        data: [{ role: 'admin' }],
        error: null,
      });

      mockRequest = {
        headers: new Headers({
          Authorization: 'Bearer admin-token',
        }),
        nextUrl: new URL(
          'http://localhost:3000/api/moderation/flagged-messages?severity=high_severity'
        ),
      };

      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(200);
    });

    it('should handle missing severity parameter gracefully', async () => {
      (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
        data: {
          user: {
            id: 'admin-user-1',
            user_metadata: { role: 'admin' },
          },
        },
        error: null,
      });

      mockSelect.mockResolvedValue({
        data: [{ role: 'admin' }],
        error: null,
      });

      mockRequest = {
        headers: new Headers({
          Authorization: 'Bearer admin-token',
        }),
        nextUrl: new URL('http://localhost:3000/api/moderation/flagged-messages'),
      };

      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const response = await GET(mockRequest as NextRequest);

      expect(response.status).toBe(200);
    });
  });
});
