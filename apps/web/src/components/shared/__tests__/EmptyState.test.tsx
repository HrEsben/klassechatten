import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from '../EmptyState';
import { Search, Plus } from 'lucide-react';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No results found" />);
    expect(screen.getByText('No results found')).toBeTruthy();
  });

  it('renders description when provided', () => {
    render(
      <EmptyState
        title="No data"
        description="Try adjusting your filters"
      />
    );
    expect(screen.getByText('Try adjusting your filters')).toBeTruthy();
  });

  it('renders icon when provided', () => {
    const { container } = render(
      <EmptyState icon={Search} title="No results" />
    );
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
  });

  it('does not render icon when not provided', () => {
    const { container } = render(<EmptyState title="No data" />);
    const icon = container.querySelector('svg');
    expect(icon).toBeFalsy();
  });

  it('renders action button when provided', () => {
    const handleClick = jest.fn();
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Add item', onClick: handleClick }}
      />
    );
    expect(screen.getByText('Add item')).toBeTruthy();
  });

  it('calls action onClick when button is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Add item', onClick: handleClick }}
      />
    );
    
    const button = screen.getByText('Add item');
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies primary variant button class', () => {
    const { container } = render(
      <EmptyState
        title="No items"
        action={{ label: 'Add', onClick: jest.fn(), variant: 'primary' }}
      />
    );
    const button = screen.getByText('Add');
    expect(button.className.includes('btn')).toBe(true);
  });

  it('applies secondary variant button class', () => {
    const { container } = render(
      <EmptyState
        title="No items"
        action={{ label: 'Add', onClick: jest.fn(), variant: 'secondary' }}
      />
    );
    const button = screen.getByText('Add');
    expect(button.className.includes('bg-secondary')).toBe(true);
  });

  it('applies accent variant button class', () => {
    const { container } = render(
      <EmptyState
        title="No items"
        action={{ label: 'Add', onClick: jest.fn(), variant: 'accent' }}
      />
    );
    const button = screen.getByText('Add');
    expect(button.className.includes('bg-accent')).toBe(true);
  });

  it('uses default iconColor when not provided', () => {
    const { container } = render(
      <EmptyState icon={Search} title="No results" />
    );
    const icon = container.querySelector('svg');
    expect((icon as any)?.className?.baseVal?.includes('text-base-content/30')).toBe(true);
  });

  it('applies custom iconColor', () => {
    const { container } = render(
      <EmptyState
        icon={Search}
        title="No results"
        iconColor="text-primary"
      />
    );
    const icon = container.querySelector('svg');
    expect((icon as any)?.className?.baseVal?.includes('text-primary')).toBe(true);
  });

  it('renders with fullScreen layout', () => {
    const { container } = render(
      <EmptyState title="No data" fullScreen={true} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className.includes('min-h-screen')).toBe(true);
  });

  it('renders with default layout when fullScreen is false', () => {
    const { container } = render(
      <EmptyState title="No data" fullScreen={false} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className.includes('bg-base-100')).toBe(true);
    expect(wrapper.className.includes('border-2')).toBe(true);
  });

  it('renders complete example with all props', () => {
    const handleClick = jest.fn();
    render(
      <EmptyState
        icon={Plus}
        title="No classes yet"
        description="Create your first class to get started"
        action={{ label: 'Create Class', onClick: handleClick, variant: 'primary' }}
        iconColor="text-primary"
      />
    );
    
    expect(screen.getByText('No classes yet')).toBeTruthy();
    expect(screen.getByText('Create your first class to get started')).toBeTruthy();
    expect(screen.getByText('Create Class')).toBeTruthy();
  });
});
