import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassCard } from '../ClassCard';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

describe('ClassCard', () => {
  const mockClassData = {
    id: '123',
    label: '5A',
    nickname: 'De Vilde 5\'ere',
    grade_level: 5,
    school_name: 'Skovgårdsskolen',
    invite_code: 'ABC123',
  };

  const mockStats = {
    memberCount: 25,
    roomCount: 3,
    messageCount: 1540,
    flaggedCount: 2,
  };

  describe('Basic Rendering', () => {
    it('renders class label', () => {
      const dataWithoutNickname = { ...mockClassData, nickname: undefined };
      render(<ClassCard classData={dataWithoutNickname} />);
      expect(screen.getByText('5A')).toBeInTheDocument();
    });

    it('renders class nickname when provided', () => {
      render(<ClassCard classData={mockClassData} />);
      expect(screen.getByText('De Vilde 5\'ere')).toBeInTheDocument();
    });

    it('renders grade level when provided', () => {
      render(<ClassCard classData={mockClassData} />);
      expect(screen.getByText(/5\./)).toBeInTheDocument();
    });

    it('renders school name when provided', () => {
      const { container } = render(<ClassCard classData={mockClassData} />);
      expect(container.textContent).toContain('Skovgårdsskolen');
    });

    it('renders without nickname', () => {
      const dataWithoutNickname = { ...mockClassData, nickname: null };
      render(<ClassCard classData={dataWithoutNickname} />);
      expect(screen.getByText('5A')).toBeInTheDocument();
      expect(screen.queryByText('De Vilde 5\'ere')).not.toBeInTheDocument();
    });
  });

  describe('Stats Display', () => {
    it('shows stats when showStats is true', () => {
      render(<ClassCard classData={mockClassData} showStats stats={mockStats} />);
      expect(screen.getByText('25')).toBeInTheDocument(); // memberCount
      expect(screen.getByText('3')).toBeInTheDocument(); // roomCount
      expect(screen.getByText('1540')).toBeInTheDocument(); // messageCount
    });

    it('does not show stats by default', () => {
      render(<ClassCard classData={mockClassData} stats={mockStats} />);
      expect(screen.queryByText('25')).not.toBeInTheDocument();
    });

    it('shows flagged count with warning badge', () => {
      const { container } = render(<ClassCard classData={mockClassData} showStats stats={mockStats} />);
      expect(container.textContent).toContain('2');
      // Check for warning icon (AlertTriangle with text-warning class)
      const warningIcon = container.querySelector('.text-warning');
      expect(warningIcon).toBeTruthy();
    });

    it('handles zero stats gracefully', () => {
      const zeroStats = { memberCount: 0, roomCount: 0, messageCount: 0, flaggedCount: 0 };
      render(<ClassCard classData={mockClassData} showStats stats={zeroStats} />);
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });

    it('handles missing stats object', () => {
      const { container } = render(<ClassCard classData={mockClassData} showStats />);
      // When stats is undefined, stats section should not render at all
      expect(container.querySelector('.grid')).toBeFalsy();
    });
  });

  describe('Invite Code', () => {
    it('shows invite code when showInviteCode is true', () => {
      render(<ClassCard classData={mockClassData} showInviteCode />);
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    it('does not show invite code by default', () => {
      render(<ClassCard classData={mockClassData} />);
      expect(screen.queryByText('ABC123')).not.toBeInTheDocument();
    });

    it('renders copy button for invite code', () => {
      render(<ClassCard classData={mockClassData} showInviteCode />);
      const copyButton = screen.getByRole('button', { name: 'Kopiér invite code' });
      expect(copyButton).toBeInTheDocument();
    });

    it('copies invite code to clipboard when copy button is clicked', async () => {
      const writeTextMock = jest.fn();
      Object.assign(navigator.clipboard, { writeText: writeTextMock });

      render(<ClassCard classData={mockClassData} showInviteCode />);
      const copyButton = screen.getByRole('button', { name: 'Kopiér invite code' });
      
      await userEvent.click(copyButton);
      
      expect(writeTextMock).toHaveBeenCalledWith('ABC123');
    });

    it('shows check icon after copying', async () => {
      const writeTextMock = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator.clipboard, { writeText: writeTextMock });

      const { container } = render(<ClassCard classData={mockClassData} showInviteCode />);
      const copyButton = screen.getByRole('button', { name: 'Kopiér invite code' });
      
      await userEvent.click(copyButton);
      
      await waitFor(() => {
        // Component shows a Check SVG icon (from lucide-react) when copied
        const svgCheck = container.querySelector('.text-success');
        expect(svgCheck).toBeTruthy();
      });
    });

    it('handles missing invite code gracefully', () => {
      const dataWithoutInvite = { ...mockClassData, invite_code: undefined };
      render(<ClassCard classData={dataWithoutInvite} showInviteCode />);
      expect(screen.queryByRole('button', { name: 'Kopiér invite code' })).not.toBeInTheDocument();
    });
  });

  describe('Click Handling', () => {
    it('calls onClick when card is clicked', async () => {
      const handleClick = jest.fn();
      const { container } = render(
        <ClassCard classData={mockClassData} onClick={handleClick} />
      );
      
      const card = container.querySelector('.card');
      if (card) {
        await userEvent.click(card);
      }
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies hover styles when clickable', () => {
      const handleClick = jest.fn();
      const { container } = render(
        <ClassCard classData={mockClassData} onClick={handleClick} />
      );
      
      const card = container.querySelector('.card');
      expect(card?.className.includes('hover:border-primary/50')).toBe(true);
      expect(card?.className.includes('cursor-pointer')).toBe(true);
    });

    it('does not apply hover styles when not clickable', () => {
      const { container } = render(<ClassCard classData={mockClassData} />);
      const card = container.querySelector('.card');
      expect(card?.className.includes('cursor-pointer')).toBe(false);
    });
  });

  describe('Custom Actions', () => {
    it('renders custom actions', () => {
      render(
        <ClassCard 
          classData={mockClassData}
          actions={
            <button className="btn btn-sm">Manage</button>
          }
        />
      );
      expect(screen.getByText('Manage')).toBeInTheDocument();
    });

    it('renders multiple actions', () => {
      render(
        <ClassCard 
          classData={mockClassData}
          actions={
            <>
              <button className="btn btn-sm">Edit</button>
              <button className="btn btn-sm btn-error">Delete</button>
            </>
          }
        />
      );
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  describe('Berlin Edgy Design', () => {
    it('uses DaisyUI card classes', () => {
      const { container } = render(<ClassCard classData={mockClassData} />);
      const card = container.querySelector('.card');
      expect(card).toBeTruthy();
      expect(card?.className.includes('bg-base-100')).toBe(true);
    });

    it('maintains border-2 styling', () => {
      const { container } = render(<ClassCard classData={mockClassData} />);
      const card = container.querySelector('.card');
      expect(card?.className.includes('border-2')).toBe(true);
    });

    it('uses proper spacing', () => {
      const { container } = render(<ClassCard classData={mockClassData} />);
      const cardBody = container.querySelector('.card-body');
      expect(cardBody).toBeTruthy();
    });

    it('uses uppercase titles', () => {
      const { container } = render(<ClassCard classData={mockClassData} />);
      const title = container.querySelector('.card-title');
      expect(title?.className.includes('uppercase')).toBe(true);
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <ClassCard classData={mockClassData} className="custom-class" />
      );
      const card = container.querySelector('.card');
      expect(card?.className.includes('custom-class')).toBe(true);
    });
  });

  describe('Complex Scenarios', () => {
    it('renders with all features enabled', () => {
      const handleClick = jest.fn();
      render(
        <ClassCard 
          classData={mockClassData}
          showStats
          stats={mockStats}
          showInviteCode
          onClick={handleClick}
          actions={<button>Action</button>}
          className="custom-class"
        />
      );
      
      expect(screen.getByText(/De Vilde 5/)).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument(); // memberCount
      expect(screen.getByText('ABC123')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('handles minimal class data', () => {
      const minimalData = {
        id: '456',
        label: '1B',
      };
      render(<ClassCard classData={minimalData} />);
      expect(screen.getByText('1B')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper button role when clickable', () => {
      const handleClick = jest.fn();
      const { container } = render(
        <ClassCard classData={mockClassData} onClick={handleClick} />
      );
      const clickableElement = container.querySelector('[role="button"]');
      expect(clickableElement || container.querySelector('button')).toBeTruthy();
    });

    it('copy button has accessible label', () => {
      render(<ClassCard classData={mockClassData} showInviteCode />);
      const copyButton = screen.getByRole('button', { name: 'Kopiér invite code' });
      expect(copyButton).toBeInTheDocument();
    });
  });
});
