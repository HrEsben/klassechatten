import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

// Helper to check if element has class
const hasClass = (element: Element | null, className: string) => {
  return element?.classList.contains(className) || false;
};

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.loading-ball');
    expect(spinner).toBeTruthy();
    expect(hasClass(spinner, 'loading-lg')).toBe(true);
  });

  it('renders with xs size', () => {
    const { container } = render(<LoadingSpinner size="xs" />);
    const spinner = container.querySelector('.loading-ball');
    expect(spinner?.className.includes('loading-xs')).toBe(true);
  });

  it('renders with sm size', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('.loading-ball');
    expect(spinner?.className.includes('loading-sm')).toBe(true);
  });

  it('renders with md size', () => {
    const { container } = render(<LoadingSpinner size="md" />);
    const spinner = container.querySelector('.loading-ball');
    expect(spinner?.className.includes('loading-md')).toBe(true);
  });

  it('renders with lg size', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector('.loading-ball');
    expect(spinner?.className.includes('loading-lg')).toBe(true);
  });

  it('renders with xl size', () => {
    const { container } = render(<LoadingSpinner size="xl" />);
    const spinner = container.querySelector('.loading-ball');
    expect(spinner?.className.includes('loading-xl')).toBe(true);
  });

  it('displays custom text when provided', () => {
    render(<LoadingSpinner text="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeTruthy();
  });

  it('displays default text when not provided', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Indlæser...')).toBeTruthy();
  });

  it('uses primary color by default', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.loading-ball');
    expect(spinner?.className.includes('text-primary')).toBe(true);
  });

  it('renders in default container without fullHeight', () => {
    const { container } = render(<LoadingSpinner fullHeight={false} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className.includes('flex')).toBe(true);
    expect(wrapper.className.includes('justify-center')).toBe(true);
    expect(wrapper.className.includes('min-h-[60vh]')).toBe(false);
  });

  it('renders in fullHeight container when specified', () => {
    const { container } = render(<LoadingSpinner fullHeight={true} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className.includes('min-h-[60vh]')).toBe(true);
  });

  it('renders in fullScreen container when specified', () => {
    const { container } = render(<LoadingSpinner fullScreen={true} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className.includes('min-h-screen')).toBe(true);
  });

  it('text is visible and properly styled', () => {
    render(<LoadingSpinner text="Test loading" />);
    const text = screen.getByText('Test loading');
    expect(text.className.includes('text-base-content/60')).toBe(true);
    expect(text.className.includes('font-medium')).toBe(true);
  });
});
