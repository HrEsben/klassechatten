import { render, screen, fireEvent } from '@testing-library/react';
import { Alert } from '../Alert';
import { AlertCircle } from 'lucide-react';

describe('Alert', () => {
  describe('Rendering', () => {
    it('renders with default info variant', () => {
      render(<Alert>Test besked</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveClass('alert-info');
      expect(screen.getByText('Test besked')).toBeInTheDocument();
    });

    it('renders with success variant', () => {
      render(<Alert variant="success">Gemt!</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('alert-success');
    });

    it('renders with warning variant', () => {
      render(<Alert variant="warning">Advarsel</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('alert-warning');
    });

    it('renders with error variant', () => {
      render(<Alert variant="error">Fejl opstod</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('alert-error');
    });

    it('renders with title', () => {
      render(
        <Alert variant="info" title="Vigtigt!">
          Dette er en vigtig besked
        </Alert>
      );
      
      expect(screen.getByText('Vigtigt!')).toBeInTheDocument();
      expect(screen.getByText('Dette er en vigtig besked')).toBeInTheDocument();
    });

    it('renders with custom icon', () => {
      render(
        <Alert icon={<AlertCircle data-testid="custom-icon" />}>
          Med ikon
        </Alert>
      );
      
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Alert className="mt-4">Test</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('mt-4');
    });

    it('has Berlin Edgy border-2 class', () => {
      render(<Alert>Test</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-2');
    });
  });

  describe('Dismissible functionality', () => {
    it('does not show dismiss button by default', () => {
      render(<Alert>Test</Alert>);
      
      expect(screen.queryByRole('button', { name: /luk advarsel/i })).not.toBeInTheDocument();
    });

    it('shows dismiss button when dismissible prop is true', () => {
      render(<Alert dismissible>Test</Alert>);
      
      expect(screen.getByRole('button', { name: /luk advarsel/i })).toBeInTheDocument();
    });

    it('removes alert when dismiss button is clicked', () => {
      render(<Alert dismissible>Test besked</Alert>);
      
      const dismissButton = screen.getByRole('button', { name: /luk advarsel/i });
      fireEvent.click(dismissButton);
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByText('Test besked')).not.toBeInTheDocument();
    });

    it('calls onDismiss callback when dismissed', () => {
      const onDismiss = jest.fn();
      render(
        <Alert dismissible onDismiss={onDismiss}>
          Test
        </Alert>
      );
      
      const dismissButton = screen.getByRole('button', { name: /luk advarsel/i });
      fireEvent.click(dismissButton);
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('dismiss button has proper ARIA label', () => {
      render(<Alert dismissible>Test</Alert>);
      
      const dismissButton = screen.getByRole('button', { name: /luk advarsel/i });
      expect(dismissButton).toHaveAttribute('aria-label', 'Luk advarsel');
    });
  });

  describe('Accessibility', () => {
    it('has role="alert" for screen readers', () => {
      render(<Alert>Test</Alert>);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('title uses semantic heading', () => {
      render(
        <Alert title="Test Titel">Beskeden</Alert>
      );
      
      const title = screen.getByText('Test Titel');
      expect(title.tagName).toBe('H3');
    });

    it('dismiss button is keyboard accessible', () => {
      render(<Alert dismissible>Test</Alert>);
      
      const dismissButton = screen.getByRole('button', { name: /luk advarsel/i });
      expect(dismissButton).toBeEnabled();
    });
  });

  describe('Content', () => {
    it('renders children as text', () => {
      render(<Alert>Simple tekst</Alert>);
      
      expect(screen.getByText('Simple tekst')).toBeInTheDocument();
    });

    it('renders children as JSX', () => {
      render(
        <Alert>
          <div data-testid="custom-content">
            <p>Paragraf 1</p>
            <p>Paragraf 2</p>
          </div>
        </Alert>
      );
      
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
      expect(screen.getByText('Paragraf 1')).toBeInTheDocument();
      expect(screen.getByText('Paragraf 2')).toBeInTheDocument();
    });

    it('renders multiline content', () => {
      render(
        <Alert title="Fejl">
          <p>Linje 1</p>
          <p>Linje 2</p>
          <p>Linje 3</p>
        </Alert>
      );
      
      expect(screen.getByText('Linje 1')).toBeInTheDocument();
      expect(screen.getByText('Linje 2')).toBeInTheDocument();
      expect(screen.getByText('Linje 3')).toBeInTheDocument();
    });
  });

  describe('Berlin Edgy Design System', () => {
    it('uses uppercase font-black title', () => {
      render(
        <Alert title="Test Titel">Content</Alert>
      );
      
      const title = screen.getByText('Test Titel');
      expect(title).toHaveClass('font-black', 'uppercase', 'tracking-tight');
    });

    it('uses border-2 for strong borders', () => {
      render(<Alert>Test</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-2');
    });

    it('dismiss button uses btn-square for sharp corners', () => {
      render(<Alert dismissible>Test</Alert>);
      
      const dismissButton = screen.getByRole('button', { name: /luk advarsel/i });
      expect(dismissButton).toHaveClass('btn-square');
    });
  });
});
