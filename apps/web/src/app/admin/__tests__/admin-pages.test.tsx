import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock AdminLayout to avoid auth/contexts during tests
jest.mock('@/components/AdminLayout', () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }));

// Mock hooks used by admin pages
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'admin@example.com' }, signOut: jest.fn() })
}));
jest.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({ profile: { role: 'admin' }, isClassAdmin: false, loading: false, roleLabel: 'Admin' })
}));
jest.mock('@/hooks/useUserClasses', () => ({
  useUserClasses: () => ({ classes: [], loading: false, error: null, refresh: jest.fn() })
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

describe('Admin pages', () => {
  it('renders System Oversigt on /admin landing for global admin', async () => {
    const AdminHome = (await import('@/app/admin/page')).default;
    render(<AdminHome />);
    expect(screen.getByText('System Oversigt')).toBeInTheDocument();
    expect(screen.getByText('Alle Flaggede Beskeder')).toBeInTheDocument();
  });

  it('shows class picker for teachers without class_id on flagged messages', async () => {
    // Override hooks for this test
    jest.doMock('@/hooks/useUserProfile', () => ({
      useUserProfile: () => ({ profile: { role: 'adult' }, isClassAdmin: true, loading: false, roleLabel: 'Lærer' })
    }));
    jest.doMock('@/hooks/useUserClasses', () => ({
      useUserClasses: () => ({ classes: [], loading: false, error: null, refresh: jest.fn() })
    }));

    const FlaggedPage = (await import('@/app/admin/flagged-messages/page')).default as React.ComponentType<any>;
    render(<FlaggedPage />);
    expect(screen.getByText('Vælg klasse')).toBeInTheDocument();
    expect(screen.getByText('Vælg en klasse for at se flaggede beskeder.')).toBeInTheDocument();
  });

  it('allows class admin (non-adult) to pick class when no class_id', async () => {
    jest.doMock('@/hooks/useUserProfile', () => ({
      useUserProfile: () => ({ profile: { role: 'guardian' }, isClassAdmin: true, loading: false, roleLabel: 'Forælder' })
    }));
    jest.doMock('@/hooks/useUserClasses', () => ({
      useUserClasses: () => ({ classes: [], loading: false, error: null, refresh: jest.fn() })
    }));

    const FlaggedPage = (await import('@/app/admin/flagged-messages/page')).default as React.ComponentType<any>;
    render(<FlaggedPage />);
    expect(screen.getByText('Vælg klasse')).toBeInTheDocument();
  });
});
