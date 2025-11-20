import React from 'react';
import { render, screen } from '@testing-library/react';
import AppFooter from '../AppFooter';
import { usePathname } from 'next/navigation';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock ThemeController
jest.mock('@/components/ThemeController', () => ({
  ThemeController: () => <div data-testid="theme-controller">Theme Controller</div>
}));

describe('AppFooter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue('/');
  });

  it('renders copyright text', () => {
    render(<AppFooter />);
    expect(screen.getByText(/© 2025 KlasseChatten/)).toBeInTheDocument();
  });

  it('renders theme controller', () => {
    render(<AppFooter />);
    // Theme controller appears twice (mobile + desktop)
    const themeControllers = screen.getAllByTestId('theme-controller');
    expect(themeControllers.length).toBe(2);
  });

  it('renders geometric pattern (colored squares)', () => {
    const { container } = render(<AppFooter />);
    
    // Check for the three colored divs (primary, secondary, accent)
    const coloredSquares = container.querySelectorAll('.bg-primary, .bg-secondary, .bg-accent');
    expect(coloredSquares.length).toBeGreaterThanOrEqual(3);
  });

  it('hides on login page', () => {
    (usePathname as jest.Mock).mockReturnValue('/login');
    const { container } = render(<AppFooter />);
    
    const footer = container.querySelector('footer');
    expect(footer).toBeNull();
  });

  it('hides on onboarding page', () => {
    (usePathname as jest.Mock).mockReturnValue('/onboarding');
    const { container } = render(<AppFooter />);
    
    const footer = container.querySelector('footer');
    expect(footer).toBeNull();
  });

  it('hides on student-signup page', () => {
    (usePathname as jest.Mock).mockReturnValue('/student-signup');
    const { container } = render(<AppFooter />);
    
    const footer = container.querySelector('footer');
    expect(footer).toBeNull();
  });

  it('shows on regular pages', () => {
    (usePathname as jest.Mock).mockReturnValue('/profile');
    const { container } = render(<AppFooter />);
    
    const footer = container.querySelector('footer');
    expect(footer).toBeInTheDocument();
  });

  it('has correct responsive classes (hidden on mobile, shown on desktop)', () => {
    const { container } = render(<AppFooter />);
    
    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('hidden', 'md:flex');
  });

  it('has correct border styling', () => {
    const { container } = render(<AppFooter />);
    
    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('border-t-2', 'border-base-content/10');
  });

  it('renders in correct layout structure', () => {
    const { container } = render(<AppFooter />);
    
    // Check footer exists and contains the geometric pattern
    const footer = container.querySelector('footer');
    expect(footer).toBeInTheDocument();
    
    // Check for grid layout on large screens
    const gridContainer = footer?.querySelector('.lg\\:grid');
    expect(gridContainer).toBeInTheDocument();
  });
});
