import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AppHeader from '../AppHeader';
import { usePathname } from 'next/navigation';

// Mock Next.js navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === 'class') return 'class-1';
      if (key === 'room') return 'room-1';
      return null;
    }
  }),
  usePathname: jest.fn(),
  Link: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
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
    classes: [
      { 
        id: 'class-1', 
        label: 'Klasse 5A',
        rooms: [
          { id: 'room-1', name: 'Generelt', is_locked: false },
          { id: 'room-2', name: 'Lektiehjælp', is_locked: false }
        ]
      },
      { 
        id: 'class-2', 
        label: 'Klasse 6B',
        rooms: [
          { id: 'room-3', name: 'Generelt', is_locked: false }
        ]
      }
    ],
    loading: false,
    error: null
  })
}));

jest.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: {
      display_name: 'Test User',
      role: 'adult',
      avatar_url: null
    },
    roleLabel: 'Lærer',
    isClassAdmin: false,
    loading: false
  })
}));

// Mock UserMenu component
jest.mock('@/components/UserMenu', () => ({
  __esModule: true,
  default: ({ userName, userRole }: any) => (
    <div data-testid="user-menu">
      {userName} - {userRole}
    </div>
  )
}));

describe('AppHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue('/');
  });

  it('renders logo and brand name', () => {
    render(<AppHeader />);
    expect(screen.getByText('KlasseChatten')).toBeInTheDocument();
  });

  it('renders class selector with current class', () => {
    render(<AppHeader />);
    // Header has two class selectors (mobile + desktop)
    const classSelectors = screen.getAllByDisplayValue('Klasse 5A');
    expect(classSelectors.length).toBeGreaterThan(0);
  });

  it('renders channel selector when in a room', () => {
    render(<AppHeader />);
    // Should show current room name
    expect(screen.getAllByText(/Generelt/).length).toBeGreaterThan(0);
  });

  it('renders user menu with user info', () => {
    render(<AppHeader />);
    // User menu appears twice (mobile + desktop)
    const userMenus = screen.getAllByTestId('user-menu');
    expect(userMenus.length).toBe(2);
    // Text appears in multiple places
    const testUserElements = screen.getAllByText(/Test User/);
    expect(testUserElements.length).toBeGreaterThan(0);
  });

  it('hides on login page', () => {
    (usePathname as jest.Mock).mockReturnValue('/login');
    const { container } = render(<AppHeader />);
    
    const header = container.querySelector('header');
    expect(header).toBeNull();
  });

  it('hides on onboarding page', () => {
    (usePathname as jest.Mock).mockReturnValue('/onboarding');
    const { container } = render(<AppHeader />);
    
    const header = container.querySelector('header');
    expect(header).toBeNull();
  });

  it('hides on student-signup page', () => {
    (usePathname as jest.Mock).mockReturnValue('/student-signup');
    const { container } = render(<AppHeader />);
    
    const header = container.querySelector('header');
    expect(header).toBeNull();
  });

  it('shows on regular pages', () => {
    (usePathname as jest.Mock).mockReturnValue('/profile');
    const { container } = render(<AppHeader />);
    
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
  });

  it('navigates to home when logo is clicked', () => {
    render(<AppHeader />);
    const logo = screen.getByText('KlasseChatten');
    
    // Check that it's a link to home
    const link = logo.closest('a');
    expect(link).toHaveAttribute('href', '/');
  });

  it('changes class when class selector is changed', () => {
    render(<AppHeader />);
    // Use the labeled desktop selector for testing
    const classSelect = screen.getByLabelText('Klasse');
    
    fireEvent.change(classSelect, { target: { value: 'class-2' } });
    
    expect(mockPush).toHaveBeenCalledWith('?class=class-2');
  });
});
