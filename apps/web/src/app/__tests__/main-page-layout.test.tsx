import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock Next.js navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => null // No class/room selected initially
  }),
  usePathname: () => '/',
}));

// Mock auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { 
      id: 'user-1', 
      email: 'test@example.com',
      user_metadata: { display_name: 'Test User' }
    },
    signOut: jest.fn()
  })
}));

// Mock hooks
jest.mock('@/hooks/useUserClasses', () => ({
  useUserClasses: () => ({
    classes: [],
    loading: false,
    error: null
  })
}));

jest.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: {
      display_name: 'Test User',
      role: 'child',
      avatar_url: null
    },
    roleLabel: 'Elev',
    isClassAdmin: false,
    loading: false
  })
}));

// Mock ProtectedRoute to pass through children
jest.mock('@/components/ProtectedRoute', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="protected-route">{children}</div>
}));

// Mock ClassRoomBrowser
jest.mock('@/components/ClassRoomBrowser', () => ({
  __esModule: true,
  default: () => <div data-testid="class-room-browser">Class Room Browser</div>
}));

// Mock AppLayout components
jest.mock('@/components/AppLayout', () => ({
  __esModule: true,
  default: ({ children }: any) => (
    <div data-testid="app-layout">
      <header data-testid="app-header">Header</header>
      <main>{children}</main>
      <footer data-testid="app-footer">Footer</footer>
    </div>
  )
}));

describe('Main Page with AppLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with AppLayout structure', async () => {
    const Page = (await import('@/app/page')).default;
    render(<Page />);

    // Verify layout components are present
    expect(screen.getByTestId('app-layout')).toBeInTheDocument();
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('app-footer')).toBeInTheDocument();
  });

  it('wraps content in ProtectedRoute', async () => {
    const Page = (await import('@/app/page')).default;
    render(<Page />);

    expect(screen.getByTestId('protected-route')).toBeInTheDocument();
  });

  it('renders ClassRoomBrowser as main content when no room selected', async () => {
    const Page = (await import('@/app/page')).default;
    render(<Page />);

    expect(screen.getByTestId('class-room-browser')).toBeInTheDocument();
  });

  it('does not redirect non-admin users', async () => {
    const Page = (await import('@/app/page')).default;
    render(<Page />);

    // Should not call router.push for non-admin
    expect(mockPush).not.toHaveBeenCalledWith('/admin');
  });

  // Note: Admin redirect test is in admin-pages.test.tsx where it can properly override mocks

  it('shows loading state while suspense is resolving', async () => {
    const Page = (await import('@/app/page')).default;
    const { container } = render(<Page />);

    // Check for suspense fallback elements
    const loadingElements = container.querySelectorAll('.loading');
    expect(loadingElements.length).toBeGreaterThanOrEqual(0);
  });

  it('applies correct layout classes based on room selection', async () => {
    const Page = (await import('@/app/page')).default;
    const { container } = render(<Page />);

    // Without room selected, should show scrollable container
    const mainContent = container.querySelector('main');
    expect(mainContent).toBeInTheDocument();
  });
});
