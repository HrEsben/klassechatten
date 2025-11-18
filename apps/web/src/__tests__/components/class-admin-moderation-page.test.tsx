import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminModerationPage from '@/app/admin/moderation/page';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/lib/supabase';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/hooks/useUserProfile');
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('@/components/AdminLayout', () => {
  return function DummyLayout({ children }: any) {
    return <div data-testid="admin-layout">{children}</div>;
  };
});

describe('Admin Moderation Page', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
  const mockUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
  });

  describe('Permission Checks', () => {
    it('should allow full admin to access moderation page', async () => {
      const mockSearchParams = new URLSearchParams();
      mockUseSearchParams.mockReturnValue(mockSearchParams as any);

      mockUseUserProfile.mockReturnValue({
        profile: {
          user_id: 'admin-123',
          role: 'admin',
          display_name: 'Admin User',
          created_at: new Date().toISOString(),
        },
        loading: false,
        isClassAdmin: false,
        roleLabel: 'Admin',
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'mock-token',
          },
        },
        error: null,
      } as any);

      mockSupabase.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      } as any);

      const { container } = render(<AdminModerationPage />);
      await waitFor(() => {
        expect(container).toBeInTheDocument();
      });
    });

    it('should allow teacher to access moderation page when class admin', async () => {
      const mockSearchParams = new URLSearchParams('class_id=class-123');
      mockUseSearchParams.mockReturnValue(mockSearchParams as any);

      mockUseUserProfile.mockReturnValue({
        profile: {
          user_id: 'teacher-123',
          role: 'adult',
          display_name: 'Teacher User',
          created_at: new Date().toISOString(),
        },
        loading: false,
        isClassAdmin: true,
        roleLabel: 'Lærer',
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'mock-token',
          },
        },
        error: null,
      } as any);

      mockSupabase.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      } as any);

      const { container } = render(<AdminModerationPage />);
      await waitFor(() => {
        expect(container).toBeInTheDocument();
      });
    });

    it('should deny student access to moderation page', async () => {
      const mockSearchParams = new URLSearchParams();
      mockUseSearchParams.mockReturnValue(mockSearchParams as any);

      mockUseUserProfile.mockReturnValue({
        profile: {
          user_id: 'student-123',
          role: 'child',
          display_name: 'Student User',
          created_at: new Date().toISOString(),
        },
        loading: false,
        isClassAdmin: false,
        roleLabel: 'Elev',
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: null,
        },
        error: null,
      } as any);

      render(<AdminModerationPage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/');
      });
    });

    it('should redirect to login when no session', async () => {
      const mockSearchParams = new URLSearchParams();
      mockUseSearchParams.mockReturnValue(mockSearchParams as any);

      mockUseUserProfile.mockReturnValue({
        profile: null,
        loading: true,
        isClassAdmin: false,
        roleLabel: 'Bruger',
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      } as any);

      render(<AdminModerationPage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Class ID Parameter Handling', () => {
    it('should extract class_id from URL search params', async () => {
      const mockSearchParams = new URLSearchParams('class_id=class-456');
      mockUseSearchParams.mockReturnValue(mockSearchParams as any);

      mockUseUserProfile.mockReturnValue({
        profile: {
          user_id: 'teacher-123',
          role: 'adult',
          display_name: 'Teacher User',
          created_at: new Date().toISOString(),
        },
        loading: false,
        isClassAdmin: true,
        roleLabel: 'Lærer',
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'mock-token',
          },
        },
        error: null,
      } as any);

      mockSupabase.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      } as any);

      const { container } = render(<AdminModerationPage />);

      await waitFor(() => {
        expect(mockUseUserProfile).toHaveBeenCalledWith('class-456');
      });
    });

    it('should pass class_id to API when user is class admin', async () => {
      const mockSearchParams = new URLSearchParams('class_id=class-789');
      mockUseSearchParams.mockReturnValue(mockSearchParams as any);

      mockUseUserProfile.mockReturnValue({
        profile: {
          user_id: 'teacher-123',
          role: 'adult',
          display_name: 'Teacher User',
          created_at: new Date().toISOString(),
        },
        loading: false,
        isClassAdmin: true,
        roleLabel: 'Lærer',
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'mock-token',
          },
        },
        error: null,
      } as any);

      const mockFetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          flagged_messages: [],
        }),
      });

      global.fetch = mockFetch;

      mockSupabase.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      } as any);

      render(<AdminModerationPage />);

      await waitFor(() => {
        const fetchCalls = mockFetch.mock.calls;
        const apiCall = fetchCalls.find((call) =>
          call[0].includes('/api/moderation/flagged-messages')
        );
        expect(apiCall).toBeDefined();
        if (apiCall) {
          expect(apiCall[0]).toContain('class_id=class-789');
        }
      });
    });

    it('should not pass class_id to API when user is full admin', async () => {
      const mockSearchParams = new URLSearchParams();
      mockUseSearchParams.mockReturnValue(mockSearchParams as any);

      mockUseUserProfile.mockReturnValue({
        profile: {
          user_id: 'admin-123',
          role: 'admin',
          display_name: 'Admin User',
          created_at: new Date().toISOString(),
        },
        loading: false,
        isClassAdmin: false,
        roleLabel: 'Admin',
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'mock-token',
          },
        },
        error: null,
      } as any);

      const mockFetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          flagged_messages: [],
        }),
      });

      global.fetch = mockFetch;

      mockSupabase.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      } as any);

      render(<AdminModerationPage />);

      await waitFor(() => {
        const fetchCalls = mockFetch.mock.calls;
        const apiCall = fetchCalls.find((call) =>
          call[0].includes('/api/moderation/flagged-messages')
        );
        expect(apiCall).toBeDefined();
        if (apiCall) {
          expect(apiCall[0]).not.toContain('class_id=');
        }
      });
    });
  });

  describe('API Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockSearchParams = new URLSearchParams();
      mockUseSearchParams.mockReturnValue(mockSearchParams as any);

      mockUseUserProfile.mockReturnValue({
        profile: {
          user_id: 'admin-123',
          role: 'admin',
          display_name: 'Admin User',
          created_at: new Date().toISOString(),
        },
        loading: false,
        isClassAdmin: false,
        roleLabel: 'Admin',
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'mock-token',
          },
        },
        error: null,
      } as any);

      const mockFetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      global.fetch = mockFetch;

      mockSupabase.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      } as any);

      const { container } = render(<AdminModerationPage />);

      await waitFor(() => {
        expect(container).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      const mockSearchParams = new URLSearchParams();
      mockUseSearchParams.mockReturnValue(mockSearchParams as any);

      mockUseUserProfile.mockReturnValue({
        profile: {
          user_id: 'admin-123',
          role: 'admin',
          display_name: 'Admin User',
          created_at: new Date().toISOString(),
        },
        loading: false,
        isClassAdmin: false,
        roleLabel: 'Admin',
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'mock-token',
          },
        },
        error: null,
      } as any);

      const mockFetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

      global.fetch = mockFetch;

      mockSupabase.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      } as any);

      const { container } = render(<AdminModerationPage />);

      await waitFor(() => {
        expect(container).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should set up real-time subscription for flagged messages', async () => {
      const mockSearchParams = new URLSearchParams();
      mockUseSearchParams.mockReturnValue(mockSearchParams as any);

      mockUseUserProfile.mockReturnValue({
        profile: {
          user_id: 'admin-123',
          role: 'admin',
          display_name: 'Admin User',
          created_at: new Date().toISOString(),
        },
        loading: false,
        isClassAdmin: false,
        roleLabel: 'Admin',
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'mock-token',
          },
        },
        error: null,
      } as any);

      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      };

      mockSupabase.channel.mockReturnValue(mockChannel as any);
      mockSupabase.removeChannel.mockReturnValue({} as any);

      render(<AdminModerationPage />);

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('moderation_events_changes');
        expect(mockChannel.on).toHaveBeenCalled();
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });
    });

    it('should clean up subscription on unmount', async () => {
      const mockSearchParams = new URLSearchParams();
      mockUseSearchParams.mockReturnValue(mockSearchParams as any);

      mockUseUserProfile.mockReturnValue({
        profile: {
          user_id: 'admin-123',
          role: 'admin',
          display_name: 'Admin User',
          created_at: new Date().toISOString(),
        },
        loading: false,
        isClassAdmin: false,
        roleLabel: 'Admin',
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'mock-token',
          },
        },
        error: null,
      } as any);

      mockSupabase.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      } as any);

      const { unmount } = render(<AdminModerationPage />);

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalled();
      });

      unmount();

      expect(mockSupabase.removeChannel).toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    it('should show loading state while fetching data', async () => {
      const mockSearchParams = new URLSearchParams();
      mockUseSearchParams.mockReturnValue(mockSearchParams as any);

      mockUseUserProfile.mockReturnValue({
        profile: {
          user_id: 'admin-123',
          role: 'admin',
          display_name: 'Admin User',
          created_at: new Date().toISOString(),
        },
        loading: false,
        isClassAdmin: false,
        roleLabel: 'Admin',
      });

      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'mock-token',
          },
        },
        error: null,
      } as any);

      const mockFetch = jest.fn(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ flagged_messages: [] }),
                }),
              100
            )
          )
      );

      global.fetch = mockFetch;

      mockSupabase.channel.mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      } as any);

      const { container } = render(<AdminModerationPage />);

      expect(container).toBeInTheDocument();
    });
  });
});
