import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';

// Mock HTMLDialogElement methods
HTMLDialogElement.prototype.showModal = jest.fn();
HTMLDialogElement.prototype.close = jest.fn();

describe('Modal', () => {
  const defaultProps = {
    id: 'test-modal',
    open: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders modal with content', () => {
      render(
        <Modal {...defaultProps}>
          <p>Modal content</p>
        </Modal>
      );
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('renders modal with title', () => {
      render(
        <Modal {...defaultProps} title="Test Modal">
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
    });

    it('renders modal without title', () => {
      render(
        <Modal {...defaultProps}>
          <p>Content</p>
        </Modal>
      );
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('renders footer actions when provided', () => {
      render(
        <Modal
          {...defaultProps}
          actions={
            <button className="btn">Action Button</button>
          }
        >
          <p>Content</p>
        </Modal>
      );
      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });

    it('does not render footer when actions not provided', () => {
      const { container } = render(
        <Modal {...defaultProps}>
          <p>Content</p>
        </Modal>
      );
      const footer = container.querySelector('.border-t-2');
      expect(footer).toBeFalsy();
    });
  });

  describe('Open/Close Behavior', () => {
    it('calls showModal when open is true', () => {
      render(
        <Modal {...defaultProps} open={true}>
          <p>Content</p>
        </Modal>
      );
      expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    });

    it('calls close when open is false', () => {
      const { rerender } = render(
        <Modal {...defaultProps} open={true}>
          <p>Content</p>
        </Modal>
      );
      
      rerender(
        <Modal {...defaultProps} open={false}>
          <p>Content</p>
        </Modal>
      );
      
      expect(HTMLDialogElement.prototype.close).toHaveBeenCalled();
    });

    it('calls onClose when close button is clicked', async () => {
      const handleClose = jest.fn();
      render(
        <Modal {...defaultProps} onClose={handleClose} title="Test">
          <p>Content</p>
        </Modal>
      );
      
      // Get the X button in header (first close button)
      const closeButtons = screen.getAllByLabelText('Close modal');
      await userEvent.click(closeButtons[0]);
      
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Size Variants', () => {
    it('renders small modal', () => {
      const { container } = render(
        <Modal {...defaultProps} size="sm">
          <p>Content</p>
        </Modal>
      );
      const modalBox = container.querySelector('.modal-box');
      expect(modalBox?.className).toContain('max-w-md');
    });

    it('renders medium modal (default)', () => {
      const { container } = render(
        <Modal {...defaultProps}>
          <p>Content</p>
        </Modal>
      );
      const modalBox = container.querySelector('.modal-box');
      expect(modalBox?.className).toContain('max-w-2xl');
    });

    it('renders large modal', () => {
      const { container } = render(
        <Modal {...defaultProps} size="lg">
          <p>Content</p>
        </Modal>
      );
      const modalBox = container.querySelector('.modal-box');
      expect(modalBox?.className).toContain('max-w-4xl');
    });

    it('renders extra large modal', () => {
      const { container } = render(
        <Modal {...defaultProps} size="xl">
          <p>Content</p>
        </Modal>
      );
      const modalBox = container.querySelector('.modal-box');
      expect(modalBox?.className).toContain('max-w-6xl');
    });
  });

  describe('Backdrop Click Handling', () => {
    it('renders with closeOnBackdrop prop', () => {
      const handleClose = jest.fn();
      const { container } = render(
        <Modal {...defaultProps} onClose={handleClose} closeOnBackdrop={true}>
          <p>Content</p>
        </Modal>
      );
      
      // Verify modal renders (closeOnBackdrop affects dialog click handler logic)
      expect(container.querySelector('.modal')).toBeTruthy();
      expect(container.querySelector('.modal-backdrop')).toBeTruthy();
    });

    it('does not close modal on dialog click when closeOnBackdrop is false', async () => {
      const handleClose = jest.fn();
      const { container } = render(
        <Modal {...defaultProps} onClose={handleClose} closeOnBackdrop={false}>
          <p>Content</p>
        </Modal>
      );
      
      const dialog = container.querySelector('dialog');
      if (dialog) {
        // Simulate click on dialog element (outside modal box)
        const clickEvent = new MouseEvent('click', {
          clientX: 0,
          clientY: 0,
          bubbles: true,
        });
        dialog.dispatchEvent(clickEvent);
        
        // Wait to ensure handler wasn't called
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(handleClose).not.toHaveBeenCalled();
      }
    });
  });

  describe('Berlin Edgy Design', () => {
    it('uses border-2 styling', () => {
      const { container } = render(
        <Modal {...defaultProps} title="Test">
          <p>Content</p>
        </Modal>
      );
      const modalBox = container.querySelector('.modal-box');
      expect(modalBox?.className).toContain('border-2');
    });

    it('uses uppercase title', () => {
      render(
        <Modal {...defaultProps} title="Test Modal">
          <p>Content</p>
        </Modal>
      );
      const title = screen.getByText('Test Modal');
      expect(title.className).toContain('uppercase');
    });

    it('uses font-black for title', () => {
      render(
        <Modal {...defaultProps} title="Test Modal">
          <p>Content</p>
        </Modal>
      );
      const title = screen.getByText('Test Modal');
      expect(title.className).toContain('font-black');
    });

    it('uses proper spacing', () => {
      const { container } = render(
        <Modal {...defaultProps} title="Test">
          <p>Content</p>
        </Modal>
      );
      const modalBox = container.querySelector('.modal-box');
      expect(modalBox?.className).toContain('p-0');
    });
  });

  describe('Accessibility', () => {
    it('has dialog role', () => {
      const { container } = render(
        <Modal {...defaultProps}>
          <p>Content</p>
        </Modal>
      );
      const dialog = container.querySelector('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('close button has accessible label', () => {
      render(
        <Modal {...defaultProps} title="Test">
          <p>Content</p>
        </Modal>
      );
      // Modal has two close buttons: X button in header and backdrop button
      const closeButtons = screen.getAllByLabelText('Close modal');
      expect(closeButtons.length).toBeGreaterThan(0);
    });

    it('has proper ID attribute', () => {
      const { container } = render(
        <Modal {...defaultProps} id="custom-modal">
          <p>Content</p>
        </Modal>
      );
      const dialog = container.querySelector('#custom-modal');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <Modal {...defaultProps} className="custom-modal-class">
          <p>Content</p>
        </Modal>
      );
      const dialog = container.querySelector('.custom-modal-class');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Complex Scenarios', () => {
    it('renders with all features enabled', () => {
      const handleClose = jest.fn();
      render(
        <Modal
          id="full-modal"
          open={true}
          onClose={handleClose}
          title="Complete Modal"
          size="lg"
          closeOnBackdrop={true}
          className="custom-class"
          actions={
            <>
              <button className="btn btn-ghost">Cancel</button>
              <button className="btn btn-primary">Confirm</button>
            </>
          }
        >
          <div className="space-y-4">
            <p>Modal content with multiple elements</p>
            <p>Second paragraph</p>
          </div>
        </Modal>
      );
      
      expect(screen.getByText('Complete Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content with multiple elements')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    it('handles multiple action buttons', async () => {
      const handleClose = jest.fn();
      const handleConfirm = jest.fn();
      
      render(
        <Modal
          {...defaultProps}
          onClose={handleClose}
          title="Confirm Action"
          actions={
            <>
              <button onClick={handleClose}>Cancel</button>
              <button onClick={handleConfirm}>Confirm</button>
            </>
          }
        >
          <p>Are you sure?</p>
        </Modal>
      );
      
      const confirmButton = screen.getByText('Confirm');
      await userEvent.click(confirmButton);
      
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Content Overflow', () => {
    it('has scrollable content area', () => {
      const { container } = render(
        <Modal {...defaultProps}>
          <div style={{ height: '2000px' }}>Tall content</div>
        </Modal>
      );
      const content = container.querySelector('.overflow-y-auto');
      expect(content).toBeInTheDocument();
    });

    it('has max height constraint', () => {
      const { container } = render(
        <Modal {...defaultProps}>
          <p>Content</p>
        </Modal>
      );
      const modalBox = container.querySelector('.modal-box');
      expect(modalBox?.className).toContain('max-h-[90vh]');
    });
  });
});
