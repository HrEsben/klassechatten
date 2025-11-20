import React from 'react';
import { render, screen } from '@testing-library/react';
import AppLayout from '../AppLayout';

// Mock the child components
jest.mock('../AppHeader', () => ({
  __esModule: true,
  default: () => <header data-testid="app-header">Mock Header</header>
}));

jest.mock('../AppFooter', () => ({
  __esModule: true,
  default: () => <footer data-testid="app-footer">Mock Footer</footer>
}));

describe('AppLayout', () => {
  it('renders header, children, and footer', () => {
    render(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByTestId('app-footer')).toBeInTheDocument();
  });

  it('wraps content in proper layout structure', () => {
    const { container } = render(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    // Check that there's a main element
    const mainElement = container.querySelector('main');
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveTextContent('Test Content');
  });

  it('applies correct flex layout classes', () => {
    const { container } = render(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    const layoutDiv = container.firstChild;
    expect(layoutDiv).toHaveClass('flex', 'flex-col', 'h-svh', 'bg-base-300', 'overflow-hidden');
  });

  it('renders multiple children correctly', () => {
    render(
      <AppLayout>
        <div>First child</div>
        <div>Second child</div>
        <div>Third child</div>
      </AppLayout>
    );

    expect(screen.getByText('First child')).toBeInTheDocument();
    expect(screen.getByText('Second child')).toBeInTheDocument();
    expect(screen.getByText('Third child')).toBeInTheDocument();
  });
});
