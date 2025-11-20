import { render, screen } from '@testing-library/react';
import UserAvatar from '../UserAvatar';

describe('UserAvatar', () => {
  it('renders with display name', () => {
    const { container } = render(<UserAvatar displayName="John Doe" />);
    expect(screen.getByText('JD')).toBeTruthy();
  });

  it('generates correct initials from single name', () => {
    render(<UserAvatar displayName="John" />);
    expect(screen.getByText('J')).toBeTruthy();
  });

  it('generates correct initials from two names', () => {
    render(<UserAvatar displayName="John Doe" />);
    expect(screen.getByText('JD')).toBeTruthy();
  });

  it('generates correct initials from three names', () => {
    render(<UserAvatar displayName="John William Doe" />);
    expect(screen.getByText('JW')).toBeTruthy(); // Takes first 2 initials
  });

  it('renders image when avatarUrl is provided', () => {
    render(
      <UserAvatar
        displayName="John Doe"
        avatarUrl="https://example.com/avatar.jpg"
      />
    );
    const img = screen.getByAltText('John Doe');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.jpg');
  });

  it('renders initials when avatarUrl is not provided', () => {
    const { container } = render(<UserAvatar displayName="Jane Smith" />);
    expect(screen.getByText('JS')).toBeTruthy();
    expect(container.querySelector('.avatar-placeholder')).toBeTruthy();
  });

  it('applies default avatar color when not provided', () => {
    const { container } = render(<UserAvatar displayName="John Doe" />);
    const placeholder = container.querySelector('.avatar-placeholder') as HTMLElement;
    expect(placeholder?.style.backgroundColor).toBe('rgb(98, 71, 245)'); // #6247f5
  });

  it('applies custom avatar color', () => {
    const { container } = render(
      <UserAvatar displayName="John Doe" avatarColor="#ff0000" />
    );
    const placeholder = container.querySelector('.avatar-placeholder') as HTMLElement;
    expect(placeholder?.style.backgroundColor).toBe('rgb(255, 0, 0)'); // #ff0000
  });

  it('renders xs size', () => {
    const { container } = render(<UserAvatar displayName="John" size="xs" />);
    const sizedDiv = container.querySelector('.w-6');
    expect(sizedDiv).toBeTruthy();
  });

  it('renders sm size', () => {
    const { container } = render(<UserAvatar displayName="John" size="sm" />);
    const sizedDiv = container.querySelector('.w-8');
    expect(sizedDiv).toBeTruthy();
  });

  it('renders md size (default)', () => {
    const { container } = render(<UserAvatar displayName="John" size="md" />);
    const sizedDiv = container.querySelector('.w-10');
    expect(sizedDiv).toBeTruthy();
  });

  it('renders lg size', () => {
    const { container } = render(<UserAvatar displayName="John" size="lg" />);
    const sizedDiv = container.querySelector('.w-16');
    expect(sizedDiv).toBeTruthy();
  });

  it('renders xl size', () => {
    const { container } = render(<UserAvatar displayName="John" size="xl" />);
    const sizedDiv = container.querySelector('.w-20');
    expect(sizedDiv).toBeTruthy();
  });

  it('renders 2xl size', () => {
    const { container } = render(<UserAvatar displayName="John" size="2xl" />);
    const sizedDiv = container.querySelector('.w-32');
    expect(sizedDiv).toBeTruthy();
  });

  it('shows online indicator when online is true', () => {
    const { container } = render(
      <UserAvatar displayName="John Doe" online={true} />
    );
    const avatar = container.querySelector('.avatar');
    expect(avatar?.className.includes('online')).toBe(true);
  });

  it('does not show online indicator when online is false', () => {
    const { container } = render(
      <UserAvatar displayName="John Doe" online={false} />
    );
    const avatar = container.querySelector('.avatar');
    expect(avatar?.className.includes('online')).toBe(false);
  });

  it('applies custom className', () => {
    const { container } = render(
      <UserAvatar displayName="John Doe" className="custom-class" />
    );
    const avatar = container.querySelector('.avatar');
    expect(avatar?.className.includes('custom-class')).toBe(true);
  });

  it('initials are uppercase', () => {
    render(<UserAvatar displayName="john doe" />);
    expect(screen.getByText('JD')).toBeTruthy();
  });

  it('initials have correct font styling', () => {
    const { container } = render(<UserAvatar displayName="John Doe" />);
    const initials = screen.getByText('JD');
    expect(initials.className.includes('font-black')).toBe(true);
    expect(initials.className.includes('text-white')).toBe(true);
  });

  it('applies correct font size for each size variant', () => {
    const sizes: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'> = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    const fontSizes = ['text-xs', 'text-sm', 'text-base', 'text-2xl', 'text-3xl', 'text-4xl'];
    
    sizes.forEach((size, index) => {
      const { container, unmount } = render(<UserAvatar displayName="John Doe" size={size} />);
      const initials = container.querySelector('span.text-white');
      expect(initials).toBeTruthy();
      expect(initials?.className.includes(fontSizes[index])).toBe(true);
      unmount();
    });
  });

  it('uses DaisyUI avatar classes', () => {
    const { container } = render(<UserAvatar displayName="John Doe" />);
    const avatar = container.querySelector('.avatar');
    expect(avatar).toBeTruthy();
  });

  it('renders complete example with all props', () => {
    const { container } = render(
      <UserAvatar
        displayName="John Doe"
        avatarUrl="https://example.com/avatar.jpg"
        avatarColor="#00ff00"
        size="lg"
        className="test-class"
        online={true}
      />
    );
    
    const avatar = container.querySelector('.avatar');
    expect(avatar?.className.includes('online')).toBe(true);
    expect(avatar?.className.includes('test-class')).toBe(true);
    
    const img = screen.getByAltText('John Doe');
    expect(img).toBeTruthy();
  });
});
