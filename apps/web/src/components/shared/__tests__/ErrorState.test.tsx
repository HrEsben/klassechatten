import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorState from '../ErrorState';

describe('ErrorState', () => {
  it('renders error message', () => {
    render(<ErrorState message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('renders default title when not provided', () => {
    render(<ErrorState message="Error occurred" />);
    expect(screen.getByText('Fejl')).toBeTruthy();
  });

  it('renders custom title when provided', () => {
    render(<ErrorState message="Error occurred" title="Ops!" />);
    expect(screen.getByText('Ops!')).toBeTruthy();
    expect(screen.queryByText('Fejl')).toBeFalsy();
  });

  it('renders error icon', () => {
    const { container } = render(<ErrorState message="Error" />);
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
    expect((icon as any)?.className?.baseVal?.includes('text-error')).toBe(true);
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByText('Prøv igen')).toBeFalsy();
  });

  it('renders retry button when onRetry is provided', () => {
    render(<ErrorState message="Error" onRetry={jest.fn()} />);
    expect(screen.getByText('Prøv igen')).toBeTruthy();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const handleRetry = jest.fn();
    render(<ErrorState message="Error" onRetry={handleRetry} />);
    
    const button = screen.getByText('Prøv igen');
    await user.click(button);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders with default container layout', () => {
    const { container } = render(<ErrorState message="Error" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className.includes('flex')).toBe(true);
    expect(wrapper.className.includes('justify-center')).toBe(true);
    expect(wrapper.className.includes('min-h-screen')).toBe(false);
    expect(wrapper.className.includes('min-h-[60vh]')).toBe(false);
  });

  it('renders with fullScreen layout', () => {
    const { container } = render(<ErrorState message="Error" fullScreen={true} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className.includes('min-h-screen')).toBe(true);
  });

  it('renders with fullHeight layout', () => {
    const { container } = render(<ErrorState message="Error" fullHeight={true} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className.includes('min-h-[60vh]')).toBe(true);
  });

  it('error box has proper Berlin Edgy styling', () => {
    const { container } = render(<ErrorState message="Error" />);
    const errorBox = container.querySelector('.bg-error\\/10');
    expect(errorBox).toBeTruthy();
    expect(errorBox?.className.includes('border-2')).toBe(true);
    expect(errorBox?.className.includes('border-error/20')).toBe(true);
  });

  it('title has proper styling', () => {
    render(<ErrorState message="Error" title="Custom Title" />);
    const title = screen.getByText('Custom Title');
    expect(title.className.includes('text-xl')).toBe(true);
    expect(title.className.includes('font-black')).toBe(true);
    expect(title.className.includes('uppercase')).toBe(true);
    expect(title.className.includes('text-error')).toBe(true);
  });

  it('retry button has ghost style', () => {
    render(<ErrorState message="Error" onRetry={jest.fn()} />);
    const button = screen.getByText('Prøv igen');
    expect(button.className.includes('btn-ghost')).toBe(true);
  });

  it('renders complete example with all props', async () => {
    const user = userEvent.setup();
    const handleRetry = jest.fn();
    render(
      <ErrorState
        message="Failed to load data"
        title="Connection Error"
        onRetry={handleRetry}
        fullHeight={true}
      />
    );
    
    expect(screen.getByText('Connection Error')).toBeTruthy();
    expect(screen.getByText('Failed to load data')).toBeTruthy();
    
    const retryButton = screen.getByText('Prøv igen');
    await user.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
