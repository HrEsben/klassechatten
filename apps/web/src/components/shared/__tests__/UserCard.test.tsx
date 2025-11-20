import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserCard } from '../UserCard';

describe('UserCard', () => {
  const mockUser = {
    display_name: 'John Doe',
    email: 'john@example.com',
    username: 'johndoe',
    avatar_url: null,
    avatar_color: '#6247f5',
    role: 'student',
  };

  describe('Rendering', () => {
    it('renders user display name', () => {
      render(<UserCard user={mockUser} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders user email when provided', () => {
      const userWithoutUsername = { ...mockUser, username: undefined };
      render(<UserCard user={userWithoutUsername} />);
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('renders user avatar with initials', () => {
      render(<UserCard user={mockUser} />);
      const initials = screen.getByText('JD');
      expect(initials).toBeInTheDocument();
    });

    it('renders without email when not provided', () => {
      const userWithoutEmail = { ...mockUser, email: undefined };
      render(<UserCard user={userWithoutEmail} />);
      expect(screen.queryByText('@')).not.toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('renders default variant with proper styling', () => {
      const { container } = render(<UserCard user={mockUser} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className.includes('py-4')).toBe(true);
      expect(card.className.includes('px-4')).toBe(true);
    });

    it('renders compact variant with reduced padding', () => {
      const { container } = render(<UserCard user={mockUser} variant="compact" />);
      const card = container.firstChild as HTMLElement;
      expect(card.className.includes('py-3')).toBe(true);
      expect(card.className.includes('px-3')).toBe(true);
    });

    it('renders list variant', () => {
      const { container } = render(<UserCard user={mockUser} variant="list" />);
      const card = container.firstChild as HTMLElement;
      expect(card.className.includes('flex')).toBe(true);
      expect(card.className.includes('items-center')).toBe(true);
    });
  });

  describe('Online Indicator', () => {
    it('shows online indicator when isOnline is true', () => {
      const { container } = render(<UserCard user={mockUser} isOnline={true} />);
      const indicator = container.querySelector('.badge-success');
      expect(indicator).toBeTruthy();
    });

    it('does not show online indicator by default', () => {
      const { container } = render(<UserCard user={mockUser} />);
      const indicator = container.querySelector('.status-online');
      expect(indicator).toBeFalsy();
    });
  });

  describe('Current User Highlighting', () => {
    it('applies highlight styling when isCurrent is true', () => {
      const { container } = render(<UserCard user={mockUser} isCurrent={true} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className.includes('bg-primary/5')).toBe(true);
    });

    it('does not apply highlight styling by default', () => {
      const { container } = render(<UserCard user={mockUser} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className.includes('bg-primary/5')).toBe(false);
    });
  });

  describe('Role Badge', () => {
    it('shows role badge when showRole is true', () => {
      render(
        <UserCard 
          user={mockUser} 
          showRole={true} 
          roleLabel="Elev"
        />
      );
      expect(screen.getByText('Elev')).toBeInTheDocument();
    });

    it('does not show role badge by default', () => {
      render(<UserCard user={mockUser} />);
      const badges = screen.queryAllByRole('status');
      expect(badges.length).toBe(0);
    });

    it('applies correct role badge color', () => {
      render(
        <UserCard 
          user={mockUser} 
          showRole={true} 
          roleLabel="Lærer"
          roleBadgeColor="badge-accent"
        />
      );
      const badge = screen.getByText('Lærer');
      expect(badge.className.includes('badge-accent')).toBe(true);
    });

    it('uses default badge-info color when not specified', () => {
      render(
        <UserCard 
          user={mockUser} 
          showRole={true} 
          roleLabel="Student"
        />
      );
      const badge = screen.getByText('Student');
      expect(badge.className.includes('badge-info')).toBe(true);
    });
  });

  describe('Interactivity', () => {
    it('renders as button when onClick is provided', () => {
      const handleClick = jest.fn();
      const { container } = render(<UserCard user={mockUser} onClick={handleClick} />);
      const card = container.firstChild;
      expect(card?.nodeName).toBe('BUTTON');
    });

    it('renders as div when onClick is not provided', () => {
      const { container } = render(<UserCard user={mockUser} />);
      const card = container.firstChild;
      expect(card?.nodeName).toBe('DIV');
    });

    it('calls onClick when clicked', async () => {
      const handleClick = jest.fn();
      const { container } = render(<UserCard user={mockUser} onClick={handleClick} />);
      const card = container.firstChild as HTMLElement;
      await userEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies hover styles when clickable', () => {
      const handleClick = jest.fn();
      const { container } = render(<UserCard user={mockUser} onClick={handleClick} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className.includes('hover:bg-base-200')).toBe(true);
      expect(card.className.includes('cursor-pointer')).toBe(true);
    });

    it('does not apply hover styles when not clickable', () => {
      const { container } = render(<UserCard user={mockUser} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className.includes('hover:bg-base-200')).toBe(false);
      expect(card.className.includes('cursor-pointer')).toBe(false);
    });
  });

  describe('Actions', () => {
    it('renders custom action buttons', () => {
      render(
        <UserCard 
          user={mockUser} 
          actions={
            <button className="btn btn-xs">Remove</button>
          }
        />
      );
      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    it('renders multiple actions', () => {
      render(
        <UserCard 
          user={mockUser} 
          actions={
            <>
              <button className="btn btn-xs btn-ghost">Edit</button>
              <button className="btn btn-xs btn-error">Delete</button>
            </>
          }
        />
      );
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <UserCard user={mockUser} className="custom-class" />
      );
      const card = container.firstChild as HTMLElement;
      expect(card.className.includes('custom-class')).toBe(true);
    });
  });

  describe('Berlin Edgy Design', () => {
    it('maintains proper spacing', () => {
      const { container } = render(<UserCard user={mockUser} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className.includes('gap-3')).toBe(true);
    });

    it('uses DaisyUI badge classes', () => {
      render(
        <UserCard 
          user={mockUser} 
          showRole={true} 
          roleLabel="Admin"
          roleBadgeColor="badge-primary"
        />
      );
      const badge = screen.getByText('Admin');
      expect(badge.className.includes('badge')).toBe(true);
      expect(badge.className.includes('badge-primary')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles user with only display_name', () => {
      const minimalUser = { display_name: 'John' };
      render(<UserCard user={minimalUser} />);
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    it('handles long display names', () => {
      const longNameUser = { 
        display_name: 'John Michael Christopher Alexander Smith-Johnson'
      };
      render(<UserCard user={longNameUser} />);
      expect(screen.getByText(/John Michael Christopher/)).toBeInTheDocument();
    });

    it('renders with all features enabled', () => {
      const handleClick = jest.fn();
      // Note: Not rendering actions here to avoid nested button warning
      // when card itself is clickable (actions with buttons inside clickable card)
      render(
        <UserCard 
          user={mockUser}
          variant="default"
          isOnline={true}
          isCurrent={true}
          showRole={true}
          roleLabel="Administrator"
          roleBadgeColor="badge-error"
          onClick={handleClick}
          className="custom-card-class"
        />
      );
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Administrator')).toBeInTheDocument();
    });
  });
});
