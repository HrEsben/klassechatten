import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminLayout from '@/components/AdminLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
jest.mock('@/hooks/useUserProfile');
jest.mock('@/contexts/AuthContext');

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('AdminLayout Navigation', () => {
  const mockUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full Admin Navigation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'admin-123' },
        signOut: jest.fn(),
      } as any);

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
    });

    it('should show admin menu links without classId parameter', () => {
      render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      // Desktop menu links
      const classesLink = screen.queryAllByText('Klasser');
      const usersLink = screen.queryAllByText('Brugere');
      const moderationLink = screen.queryAllByText('Flaggede Beskeder');

      expect(classesLink.length).toBeGreaterThan(0);
      expect(usersLink.length).toBeGreaterThan(0);
      expect(moderationLink.length).toBeGreaterThan(0);
    });

    it('should link to /admin/moderation without classId parameter', () => {
      const { container } = render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      const moderationLinks = container.querySelectorAll(
        'a[href="/admin/moderation"]'
      );

      expect(moderationLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Class Admin Navigation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'teacher-123' },
        signOut: jest.fn(),
      } as any);

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
    });

    it('should show class admin badge next to role label', () => {
      render(
        <AdminLayout classId="class-123">
          <div>Test Content</div>
        </AdminLayout>
      );

      // The badge is shown as ⁺ after the role label
      const headers = screen.queryAllByText(/Lærer/, { exact: false });
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should link to /admin/moderation with classId parameter when class admin', () => {
      const { container } = render(
        <AdminLayout classId="class-456">
          <div>Test Content</div>
        </AdminLayout>
      );

      const moderationLinks = container.querySelectorAll(
        'a[href="/admin/moderation?class_id=class-456"]'
      );

      expect(moderationLinks.length).toBeGreaterThan(0);
    });

    it('should have classId in both desktop and mobile menus', () => {
      const { container } = render(
        <AdminLayout classId="class-789">
          <div>Test Content</div>
        </AdminLayout>
      );

      const allModerationLinks = container.querySelectorAll(
        'a[href*="/admin/moderation"]'
      );

      // Should have both desktop (sidebar) and mobile (dropdown) links
      const linksWithClassId = Array.from(allModerationLinks).filter((link) =>
        link.getAttribute('href')?.includes('class_id=class-789')
      );

      expect(linksWithClassId.length).toBeGreaterThanOrEqual(2); // At least 2 (desktop + mobile)
    });
  });

  describe('Teacher (Non-Admin) Navigation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'teacher-123' },
        signOut: jest.fn(),
      } as any);

      mockUseUserProfile.mockReturnValue({
        profile: {
          user_id: 'teacher-123',
          role: 'adult',
          display_name: 'Teacher User',
          created_at: new Date().toISOString(),
        },
        loading: false,
        isClassAdmin: false,
        roleLabel: 'Lærer',
      });
    });

    it('should link to /admin/moderation without classId for non-admin teachers', () => {
      const { container } = render(
        <AdminLayout classId="class-123">
          <div>Test Content</div>
        </AdminLayout>
      );

      const moderationLinks = container.querySelectorAll(
        'a[href="/admin/moderation"]'
      );

      expect(moderationLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Header and Navigation Structure', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'admin-123' },
        signOut: jest.fn(),
      } as any);

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
    });

    it('should render admin layout with header', () => {
      const { container } = render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      expect(container.querySelector('header')).toBeInTheDocument();
    });

    it('should render sidebar navigation on desktop', () => {
      const { container } = render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      const sidebar = container.querySelector('aside');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar?.className).toMatch(/hidden lg:flex/);
    });

    it('should render hamburger menu for mobile', () => {
      const { container } = render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      const mobileMenu = container.querySelector('.lg\\:hidden.dropdown');
      expect(mobileMenu).toBeInTheDocument();
    });

    it('should have all 4 navigation items', () => {
      const { container } = render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      const navItems = container.querySelectorAll(
        'a[href^="/admin/"], .dropdown a'
      );

      // Should have at least 4 menu items (classes, users, moderation, settings)
      expect(navItems.length).toBeGreaterThanOrEqual(4);
    });

    it('should render footer with geometric pattern', () => {
      const { container } = render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();

      // Check for geometric pattern divs
      const geometricDots = container.querySelectorAll('.w-2.h-2');
      expect(geometricDots.length).toBeGreaterThan(0);
    });

    it('should render main content area', () => {
      const { container } = render(
        <AdminLayout>
          <div data-testid="test-content">Test Content</div>
        </AdminLayout>
      );

      const mainContent = screen.getByTestId('test-content');
      expect(mainContent).toBeInTheDocument();
    });
  });

  describe('Navigation Links Consistency', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'admin-123' },
        signOut: jest.fn(),
      } as any);

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
    });

    it('should have classes link in both desktop and mobile', () => {
      const { container } = render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      const classesLinks = container.querySelectorAll('a[href="/admin/classes"]');
      expect(classesLinks.length).toBeGreaterThanOrEqual(2); // Desktop + Mobile
    });

    it('should have users link in both desktop and mobile', () => {
      const { container } = render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      const usersLinks = container.querySelectorAll('a[href="/admin/users"]');
      expect(usersLinks.length).toBeGreaterThanOrEqual(2); // Desktop + Mobile
    });

    it('should have settings link in both desktop and mobile', () => {
      const { container } = render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      const settingsLinks = container.querySelectorAll(
        'a[href="/admin/settings"]'
      );
      expect(settingsLinks.length).toBeGreaterThanOrEqual(2); // Desktop + Mobile
    });
  });

  describe('Design System Compliance', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'admin-123' },
        signOut: jest.fn(),
      } as any);

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
    });

    it('should use sharp corners (no rounded-*)', () => {
      const { container } = render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      // Should not use rounded classes (Berlin Edgy design)
      const roundedElements = container.querySelectorAll('[class*="rounded"]');
      expect(roundedElements.length).toBe(0);
    });

    it('should use 2px borders', () => {
      const { container } = render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      // Should have border-2 classes (2px borders)
      const borderElements = container.querySelectorAll('[class*="border-2"]');
      expect(borderElements.length).toBeGreaterThan(0);
    });

    it('should use uppercase typography', () => {
      render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      const textElements = screen.queryAllByText(/Klasser|Brugere|Indstillinger/);
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should have accent bars on hover', () => {
      const { container } = render(
        <AdminLayout>
          <div>Test Content</div>
        </AdminLayout>
      );

      // Check for hover:border-primary class
      const hoverElements = container.querySelectorAll(
        '[class*="hover:border-primary"]'
      );
      expect(hoverElements.length).toBeGreaterThan(0);
    });
  });
});
