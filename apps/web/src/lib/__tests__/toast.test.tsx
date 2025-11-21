import { toast } from '../toast';
import { waitFor, act } from '@testing-library/react';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  CheckCircle2: () => <svg data-testid="check-icon" />,
  AlertCircle: () => <svg data-testid="alert-icon" />,
  Info: () => <svg data-testid="info-icon" />,
  AlertTriangle: () => <svg data-testid="warning-icon" />,
  X: () => <svg data-testid="close-icon" />,
}));

describe('Toast', () => {
  beforeEach(() => {
    // Clean up any existing toasts
    document.body.innerHTML = '';
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clean up
    act(() => {
      toast.dismissAll();
    });
    document.body.innerHTML = '';
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Success Toast', () => {
    it('renders success toast with message', () => {
      act(() => {
        toast.success('Operation successful');
      });
      
      const toastContainer = document.querySelector('.toast');
      expect(toastContainer).toBeTruthy();
      expect(toastContainer?.textContent).toContain('Operation successful');
    });

    it('shows success alert styling', () => {
      act(() => {
        toast.success('Success message');
      });
      
      const alert = document.querySelector('.alert-success');
      expect(alert).toBeTruthy();
    });

    it('displays check icon', () => {
      act(() => {
        toast.success('Success');
      });
      
      const icon = document.querySelector('[data-testid="check-icon"]');
      expect(icon).toBeTruthy();
    });
  });

  describe('Error Toast', () => {
    it('renders error toast with message', () => {
      act(() => {
        toast.error('Operation failed');
      });
      
      const toastContainer = document.querySelector('.toast');
      expect(toastContainer?.textContent).toContain('Operation failed');
    });

    it('shows error alert styling', () => {
      act(() => {
        toast.error('Error message');
      });
      
      const alert = document.querySelector('.alert-error');
      expect(alert).toBeTruthy();
    });

    it('displays alert icon', () => {
      act(() => {
        toast.error('Error');
      });
      
      const icon = document.querySelector('[data-testid="alert-icon"]');
      expect(icon).toBeTruthy();
    });
  });

  describe('Info Toast', () => {
    it('renders info toast with message', () => {
      act(() => {
        toast.info('Information message');
      });
      
      const toastContainer = document.querySelector('.toast');
      expect(toastContainer?.textContent).toContain('Information message');
    });

    it('shows info alert styling', () => {
      act(() => {
        toast.info('Info message');
      });
      
      const alert = document.querySelector('.alert-info');
      expect(alert).toBeTruthy();
    });

    it('displays info icon', () => {
      act(() => {
        toast.info('Info');
      });
      
      const icon = document.querySelector('[data-testid="info-icon"]');
      expect(icon).toBeTruthy();
    });
  });

  describe('Warning Toast', () => {
    it('renders warning toast with message', () => {
      act(() => {
        toast.warning('Warning message');
      });
      
      const toastContainer = document.querySelector('.toast');
      expect(toastContainer?.textContent).toContain('Warning message');
    });

    it('shows warning alert styling', () => {
      act(() => {
        toast.warning('Warning');
      });
      
      const alert = document.querySelector('.alert-warning');
      expect(alert).toBeTruthy();
    });

    it('displays warning icon', () => {
      act(() => {
        toast.warning('Warning');
      });
      
      const icon = document.querySelector('[data-testid="warning-icon"]');
      expect(icon).toBeTruthy();
    });
  });

  describe('Auto-dismiss', () => {
    it('dismisses toast after default duration (3000ms)', async () => {
      act(() => {
        toast.success('Auto-dismiss test');
      });
      
      expect(document.querySelector('.toast')).toBeTruthy();
      
      // Fast-forward time by 3000ms
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      // Wait for fade-out animation (200ms)
      act(() => {
        jest.advanceTimersByTime(200);
      });
      
      await waitFor(() => {
        expect(document.querySelector('.toast')).toBeFalsy();
      });
    });

    it('dismisses toast after custom duration', async () => {
      act(() => {
        toast.success('Quick message', { duration: 1500 });
      });
      
      expect(document.querySelector('.toast')).toBeTruthy();
      
      // Fast-forward by custom duration
      act(() => {
        jest.advanceTimersByTime(1500);
        jest.advanceTimersByTime(200); // Fade-out
      });
      
      await waitFor(() => {
        expect(document.querySelector('.toast')).toBeFalsy();
      });
    });
  });

  describe('Manual Close', () => {
    it('has close button', () => {
      act(() => {
        toast.success('Closeable toast');
      });
      
      const closeButton = document.querySelector('button[aria-label="Dismiss"]');
      expect(closeButton).toBeTruthy();
    });

    it('closes toast when close button clicked', async () => {
      act(() => {
        toast.success('Click to close');
      });
      
      const closeButton = document.querySelector('button[aria-label="Dismiss"]') as HTMLButtonElement;
      
      act(() => {
        closeButton?.click();
      });
      
      // Advance through fade-out animation
      act(() => {
        jest.advanceTimersByTime(200);
      });
      
      await waitFor(() => {
        expect(document.querySelector('.toast')).toBeFalsy();
      });
    });

    it('displays close icon', () => {
      act(() => {
        toast.success('Message');
      });
      
      const closeIcon = document.querySelector('[data-testid="close-icon"]');
      expect(closeIcon).toBeTruthy();
    });
  });

  describe('Multiple Toasts', () => {
    it('can display multiple toasts simultaneously', () => {
      act(() => {
        toast.success('First toast');
        toast.error('Second toast');
        toast.info('Third toast');
      });
      
      const toasts = document.querySelectorAll('.alert');
      expect(toasts.length).toBe(3);
    });

    it('shows different toast types together', () => {
      act(() => {
        toast.success('Success');
        toast.error('Error');
      });
      
      expect(document.querySelector('.alert-success')).toBeTruthy();
      expect(document.querySelector('.alert-error')).toBeTruthy();
    });

    it('each toast has unique ID', () => {
      act(() => {
        toast.success('Toast 1');
        toast.success('Toast 2');
      });
      
      const toastElements = document.querySelectorAll('[id^="toast-"]');
      const ids = Array.from(toastElements).map(el => el.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(2);
    });
  });

  describe('Position Variants', () => {
    it('renders in top-right position by default', () => {
      act(() => {
        toast.success('Default position');
      });
      
      const container = document.querySelector('.toast');
      expect(container?.className).toContain('toast-top');
      expect(container?.className).toContain('toast-end');
    });

    it('renders in top-left position', () => {
      act(() => {
        toast.success('Top left', { position: 'top-left' });
      });
      
      const container = document.querySelector('.toast');
      expect(container?.className).toContain('toast-top');
      expect(container?.className).toContain('toast-start');
    });

    it('renders in top-center position', () => {
      act(() => {
        toast.success('Top center', { position: 'top-center' });
      });
      
      const container = document.querySelector('.toast');
      expect(container?.className).toContain('toast-top');
      expect(container?.className).toContain('toast-center');
    });

    it('renders in bottom-left position', () => {
      act(() => {
        toast.success('Bottom left', { position: 'bottom-left' });
      });
      
      const container = document.querySelector('.toast');
      expect(container?.className).toContain('toast-bottom');
      expect(container?.className).toContain('toast-start');
    });

    it('renders in bottom-center position', () => {
      act(() => {
        toast.success('Bottom center', { position: 'bottom-center' });
      });
      
      const container = document.querySelector('.toast');
      expect(container?.className).toContain('toast-bottom');
      expect(container?.className).toContain('toast-center');
    });

    it('renders in bottom-right position', () => {
      act(() => {
        toast.success('Bottom right', { position: 'bottom-right' });
      });
      
      const container = document.querySelector('.toast');
      expect(container?.className).toContain('toast-bottom');
      expect(container?.className).toContain('toast-end');
    });
  });

  describe('Berlin Edgy Design', () => {
    it('uses border-2 styling', () => {
      act(() => {
        toast.success('Berlin Edgy');
      });
      
      const alert = document.querySelector('.alert');
      expect(alert?.className).toContain('border-2');
    });

    it('has shadow styling', () => {
      act(() => {
        toast.success('Shadow test');
      });
      
      const alert = document.querySelector('.alert');
      expect(alert?.className).toContain('shadow-lg');
    });

    it('has proper z-index', () => {
      act(() => {
        toast.success('Z-index test');
      });
      
      const container = document.querySelector('.toast') as HTMLElement;
      expect(container?.style.zIndex).toBe('9999');
    });
  });

  describe('Accessibility', () => {
    it('close button has accessible label', () => {
      act(() => {
        toast.success('Accessible toast');
      });
      
      const closeButton = document.querySelector('button[aria-label="Dismiss"]');
      expect(closeButton).toBeTruthy();
    });

    it('message is readable text', () => {
      const message = 'This is a readable message';
      
      act(() => {
        toast.success(message);
      });
      
      const toastContent = document.querySelector('.toast');
      expect(toastContent?.textContent).toContain(message);
    });
  });

  describe('Container Management', () => {
    it('creates container when first toast shown', () => {
      expect(document.querySelector('.toast')).toBeFalsy();
      
      act(() => {
        toast.success('First toast');
      });
      
      expect(document.querySelector('.toast')).toBeTruthy();
    });

    it('removes container when all toasts dismissed', async () => {
      act(() => {
        toast.success('Only toast', { duration: 1000 });
      });
      
      expect(document.querySelector('.toast')).toBeTruthy();
      
      // Dismiss toast
      act(() => {
        jest.advanceTimersByTime(1000);
        jest.advanceTimersByTime(200); // Fade-out
      });
      
      await waitFor(() => {
        expect(document.querySelector('.toast')).toBeFalsy();
      });
    });

    it('keeps container when multiple toasts exist', () => {
      act(() => {
        toast.success('Toast 1', { duration: 1000 });
      });
      
      // Add second toast after a delay
      act(() => {
        jest.advanceTimersByTime(500);
        toast.success('Toast 2', { duration: 5000 });
      });
      
      // Dismiss first toast (at 1000ms total)
      act(() => {
        jest.advanceTimersByTime(500); // Total 1000ms
        jest.advanceTimersByTime(200); // Fade-out
      });
      
      // Container should still exist for second toast
      expect(document.querySelector('.toast')).toBeTruthy();
      expect(document.querySelectorAll('.alert').length).toBeGreaterThan(0);
    });
  });

  describe('Dismiss All', () => {
    it('dismisses all toasts when dismissAll called', async () => {
      act(() => {
        toast.success('Toast 1');
        toast.error('Toast 2');
        toast.info('Toast 3');
      });
      
      expect(document.querySelectorAll('.alert').length).toBe(3);
      
      act(() => {
        toast.dismissAll();
      });
      
      // Advance through fade-out animations
      act(() => {
        jest.advanceTimersByTime(200);
      });
      
      await waitFor(() => {
        expect(document.querySelectorAll('.alert').length).toBe(0);
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('handles rapid successive toasts', () => {
      act(() => {
        for (let i = 0; i < 5; i++) {
          toast.success(`Toast ${i + 1}`);
        }
      });
      
      const toasts = document.querySelectorAll('.alert');
      expect(toasts.length).toBe(5);
    });

    it('handles mixed toast types with different durations', () => {
      act(() => {
        toast.success('Quick', { duration: 1000 });
        toast.error('Medium', { duration: 2000 });
        toast.info('Long', { duration: 3000 });
      });
      
      expect(document.querySelectorAll('.alert').length).toBe(3);
      
      // After 1000ms, first toast should be gone
      act(() => {
        jest.advanceTimersByTime(1000);
        jest.advanceTimersByTime(200);
      });
      
      expect(document.querySelectorAll('.alert').length).toBeLessThan(3);
    });

    it('handles long messages', () => {
      const longMessage = 'This is a very long message that should still display correctly in the toast notification without breaking the layout or causing overflow issues';
      
      act(() => {
        toast.success(longMessage);
      });
      
      const toastContent = document.querySelector('.toast');
      expect(toastContent?.textContent).toContain(longMessage);
    });
  });
});
