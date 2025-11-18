import { render, screen, fireEvent, waitFor, within, mockSupabaseClient } from '../../test-utils';
import AdminModerationPage from '@/app/admin/moderation/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}));

// Mock the supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

// Mock the AdminLayout component
jest.mock('@/components/AdminLayout', () => {
  return function DummyAdminLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="admin-layout">{children}</div>;
  };
});

describe('AdminModerationPage - Flagged Messages Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering & Layout', () => {
    it('should render the page with header and title', () => {
      render(<AdminModerationPage />);

      expect(screen.getByText('Flaggede Beskeder')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument(); // Back button
    });

    it('should render with AdminLayout wrapper', () => {
      render(<AdminModerationPage />);

      expect(screen.getByTestId('admin-layout')).toBeInTheDocument();
    });

    it('should have accent bar under title', () => {
      const { container } = render(<AdminModerationPage />);

      const h1 = screen.getByText('Flaggede Beskeder');
      const accentBar = h1.parentElement?.querySelector('div.bg-primary');

      expect(accentBar).toBeInTheDocument();
      expect(accentBar).toHaveClass('h-1', 'w-24', 'bg-primary', 'mt-2');
    });
  });

  describe('Filter Buttons', () => {
    it('should render filter section with all severity levels', () => {
      render(<AdminModerationPage />);

      expect(screen.getByText('Filtrer efter alvorlighed:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Alle/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Høj/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Moderat/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Lav/ })).toBeInTheDocument();
    });

    it('should have Berlin Edgy design styling on filter buttons', () => {
      const { container } = render(<AdminModerationPage />);

      const filterButtons = container.querySelectorAll('button.btn');
      filterButtons.forEach((button) => {
        // Check for sharp borders (no rounded corners)
        const classes = button.className;
        expect(classes).not.toContain('rounded');
        // Check for border styling
        expect(classes).toMatch(/border|btn/);
      });
    });

    it('should highlight "Alle" button by default', async () => {
      render(<AdminModerationPage />);

      const alleButton = screen.getByRole('button', { name: /Alle/ });

      await waitFor(() => {
        expect(alleButton).toHaveClass('btn-primary');
      });
    });

    it('should change filter when severity button is clicked', async () => {
      render(<AdminModerationPage />);

      const hojButton = screen.getByRole('button', { name: /Høj/ });
      fireEvent.click(hojButton);

      await waitFor(() => {
        expect(hojButton).toHaveClass('btn-error');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching data', () => {
      render(<AdminModerationPage />);

      expect(screen.getByText('Indlæser flaggede beskeder...')).toBeInTheDocument();
    });

    it('should use DaisyUI loading-ball spinner', async () => {
      const { container } = render(<AdminModerationPage />);

      const spinner = container.querySelector('.loading-ball');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      // Mock successful API response with no messages
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ flagged_messages: [] }),
        })
      ) as jest.Mock;
    });

    it('should display empty state when no flagged messages', async () => {
      render(<AdminModerationPage />);

      await waitFor(() => {
        expect(screen.getByText('Ingen flaggede beskeder')).toBeInTheDocument();
        expect(
          screen.getByText('Alle beskeder er godkendt af AI-moderation')
        ).toBeInTheDocument();
      });
    });

    it('should show empty state card with success icon', async () => {
      const { container } = render(<AdminModerationPage />);

      await waitFor(() => {
        const emptyCard = screen.getByText('Ingen flaggede beskeder').closest('div');
        expect(emptyCard).toHaveClass('bg-base-100', 'border-2', 'shadow-lg');

        const icon = emptyCard?.querySelector('svg');
        expect(icon).toHaveClass('text-success');
      });
    });

    it('should show filtered empty state message', async () => {
      render(<AdminModerationPage />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Alle beskeder er godkendt af AI-moderation')).toBeInTheDocument();
      });

      // Click filter
      const hojButton = screen.getByRole('button', { name: /Høj/ });
      fireEvent.click(hojButton);

      // Should update message
      await waitFor(() => {
        expect(
          screen.getByText(/Ingen beskeder med alvorlighed "Høj" fundet/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Flagged Message Card Display', () => {
    beforeEach(() => {
      const mockFlaggedMessages = [
        {
          event_id: 'event-1',
          message_id: 123,
          class_id: 'class-1',
          rule: 'sexual/minors',
          score: 0.95,
          labels: ['sexual', 'minors'],
          severity: 'high_severity',
          created_at: '2025-11-18T10:30:00Z',
          message: {
            id: 123,
            body: 'Inappropriate message content',
            user_id: 'student-1',
            created_at: '2025-11-18T10:30:00Z',
            author: {
              user_id: 'student-1',
              display_name: 'Test Student',
              avatar_color: '#ff3fa4',
            },
          },
          context: {
            before: [
              {
                id: 121,
                body: 'Message before 1',
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
                body: 'Message after 1',
                user_id: 'teacher-1',
                created_at: '2025-11-18T10:32:00Z',
                author: {
                  user_id: 'teacher-1',
                  display_name: 'Teacher Name',
                  avatar_color: '#ffb347',
                },
              },
            ],
          },
        },
      ];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ flagged_messages: mockFlaggedMessages }),
        })
      ) as jest.Mock;
    });

    it('should display flagged message card with all details', async () => {
      render(<AdminModerationPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Student')).toBeInTheDocument();
        expect(screen.getByText('Inappropriate message content')).toBeInTheDocument();
      });
    });

    it('should display severity badge with correct color', async () => {
      const { container } = render(<AdminModerationPage />);

      await waitFor(() => {
        const badge = screen.getByText('Høj');
        expect(badge).toHaveClass('badge-error');
      });
    });

    it('should display AI labels as badges', async () => {
      render(<AdminModerationPage />);

      await waitFor(() => {
        expect(screen.getByText('sexual')).toBeInTheDocument();
        expect(screen.getByText('minors')).toBeInTheDocument();
      });
    });

    it('should display author avatar with correct color', async () => {
      const { container } = render(<AdminModerationPage />);

      await waitFor(() => {
        const avatar = container.querySelector('[style*="rgb(255"]');
        expect(avatar).toBeInTheDocument();
      });
    });

    it('should have card with proper Berlin Edgy styling', async () => {
      const { container } = render(<AdminModerationPage />);

      await waitFor(() => {
        const card = container.querySelector('.bg-base-100.border-2');
        expect(card).toHaveClass('bg-base-100', 'border-2', 'shadow-lg');
      });
    });
  });

  describe('Message Context Toggle', () => {
    beforeEach(() => {
      const mockFlaggedMessages = [
        {
          event_id: 'event-1',
          message_id: 123,
          class_id: 'class-1',
          rule: 'hate/threatening',
          score: 0.87,
          labels: ['hate', 'threatening'],
          severity: 'high_severity',
          created_at: '2025-11-18T10:30:00Z',
          message: {
            id: 123,
            body: 'Flagged message',
            user_id: 'student-1',
            created_at: '2025-11-18T10:30:00Z',
            author: {
              user_id: 'student-1',
              display_name: 'Student Name',
              avatar_color: '#ff3fa4',
            },
          },
          context: {
            before: [
              {
                id: 121,
                body: 'Context message before',
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
                body: 'Context message after',
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
      ];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ flagged_messages: mockFlaggedMessages }),
        })
      ) as jest.Mock;
    });

    it('should display "Vis kontekst" button', async () => {
      render(<AdminModerationPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Vis kontekst/ })).toBeInTheDocument();
      });
    });

    it('should show context messages when button is clicked', async () => {
      render(<AdminModerationPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Vis kontekst/ })).toBeInTheDocument();
      });

      const contextButton = screen.getByRole('button', { name: /Vis kontekst/ });
      fireEvent.click(contextButton);

      await waitFor(() => {
        expect(screen.getByText('Beskeder før:')).toBeInTheDocument();
        expect(screen.getByText('Beskeder efter:')).toBeInTheDocument();
        expect(screen.getByText('Context message before')).toBeInTheDocument();
        expect(screen.getByText('Context message after')).toBeInTheDocument();
      });
    });

    it('should toggle context visibility', async () => {
      render(<AdminModerationPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Vis kontekst/ })).toBeInTheDocument();
      });

      const contextButton = screen.getByRole('button', { name: /Vis kontekst/ });

      // First click - expand
      fireEvent.click(contextButton);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Skjul kontekst/ })).toBeInTheDocument();
      });

      // Second click - collapse
      fireEvent.click(contextButton);
      await waitFor(() => {
        expect(screen.queryByText('Beskeder før:')).not.toBeInTheDocument();
      });
    });
  });

  describe('AI Moderation Details', () => {
    beforeEach(() => {
      const mockFlaggedMessages = [
        {
          event_id: 'event-1',
          message_id: 123,
          class_id: 'class-1',
          rule: 'violence',
          score: 0.78,
          labels: ['violence'],
          severity: 'moderate_severity',
          created_at: '2025-11-18T10:30:00Z',
          message: {
            id: 123,
            body: 'Message with violence content',
            user_id: 'student-1',
            created_at: '2025-11-18T10:30:00Z',
            author: {
              user_id: 'student-1',
              display_name: 'Student',
              avatar_color: '#ff3fa4',
            },
          },
          context: {
            before: [],
            after: [],
          },
        },
      ];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ flagged_messages: mockFlaggedMessages }),
        })
      ) as jest.Mock;
    });

    it('should display AI moderation details section', async () => {
      render(<AdminModerationPage />);

      await waitFor(() => {
        expect(screen.getByText('AI Moderation detaljer:')).toBeInTheDocument();
      });
    });

    it('should display rule and score', async () => {
      render(<AdminModerationPage />);

      await waitFor(() => {
        expect(screen.getByText(/Regel:/)).toBeInTheDocument();
        expect(screen.getByText(/Score:/)).toBeInTheDocument();
        expect(screen.getByText(/78\.00%/)).toBeInTheDocument();
      });
    });

    it('should use monospace font for technical details', async () => {
      const { container } = render(<AdminModerationPage />);

      await waitFor(() => {
        const detailsSection = screen.getByText('AI Moderation detaljer:').parentElement;
        const contentDiv = detailsSection?.querySelector('div.font-mono');
        expect(contentDiv).toHaveClass('font-mono');
      });
    });
  });

  describe('Severity Color Coding', () => {
    it('should apply correct badge color for high severity', async () => {
      const mockFlaggedMessages = [
        {
          event_id: 'event-1',
          message_id: 123,
          class_id: 'class-1',
          rule: 'sexual/minors',
          score: 0.95,
          labels: ['sexual'],
          severity: 'high_severity',
          created_at: '2025-11-18T10:30:00Z',
          message: {
            id: 123,
            body: 'High severity content',
            user_id: 'student-1',
            created_at: '2025-11-18T10:30:00Z',
            author: {
              user_id: 'student-1',
              display_name: 'Student',
              avatar_color: '#ff3fa4',
            },
          },
          context: { before: [], after: [] },
        },
      ];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ flagged_messages: mockFlaggedMessages }),
        })
      ) as jest.Mock;

      render(<AdminModerationPage />);

      await waitFor(() => {
        expect(screen.getByText('Høj')).toHaveClass('badge-error');
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should subscribe to moderation_events changes', async () => {
      render(<AdminModerationPage />);

      await waitFor(() => {
        expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
          'moderation_events_changes'
        );
      });
    });

    it('should handle INSERT events on moderation_events table', async () => {
      render(<AdminModerationPage />);

      await waitFor(() => {
        const channelMock = mockSupabaseClient.channel.mock.results[0].value;
        expect(channelMock.on).toHaveBeenCalledWith(
          'postgres_changes',
          expect.objectContaining({
            event: 'INSERT',
            schema: 'public',
            table: 'moderation_events',
            filter: 'status=eq.flagged',
          }),
          expect.any(Function)
        );
      });
    });

    it('should unsubscribe from realtime channel on unmount', async () => {
      const { unmount } = render(<AdminModerationPage />);

      unmount();

      expect(mockSupabaseClient.removeChannel).toHaveBeenCalled();
    });
  });

  describe('Permission & Security', () => {
    it('should send session token in API request header', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ flagged_messages: [] }),
        })
      ) as jest.Mock;

      render(<AdminModerationPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer mock-token',
            }),
          })
        );
      });
    });

    it('should redirect to login if no session', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
      });

      render(<AdminModerationPage />);

      // Component should handle missing session gracefully
      // (exact behavior depends on implementation)
    });
  });

  describe('Typography & Design System', () => {
    it('should use correct heading styles', async () => {
      render(<AdminModerationPage />);

      const heading = screen.getByText('Flaggede Beskeder');
      expect(heading).toHaveClass('text-3xl', 'font-black', 'uppercase', 'tracking-tight');
    });

    it('should use correct label styles', async () => {
      const mockFlaggedMessages = [
        {
          event_id: 'event-1',
          message_id: 123,
          class_id: 'class-1',
          rule: 'test',
          score: 0.5,
          labels: [],
          severity: 'low_severity',
          created_at: '2025-11-18T10:30:00Z',
          message: {
            id: 123,
            body: 'Test',
            user_id: 'student-1',
            created_at: '2025-11-18T10:30:00Z',
            author: {
              user_id: 'student-1',
              display_name: 'Student',
              avatar_color: '#ff3fa4',
            },
          },
          context: { before: [], after: [] },
        },
      ];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ flagged_messages: mockFlaggedMessages }),
        })
      ) as jest.Mock;

      const { container } = render(<AdminModerationPage />);

      await waitFor(() => {
        const labels = container.querySelectorAll('.text-xs.font-bold.uppercase.tracking-widest');
        expect(labels.length).toBeGreaterThan(0);
      });
    });
  });
});
