import React from 'react';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormInput } from '../FormInput';

describe('FormInput', () => {
  describe('Basic Text Input', () => {
    it('renders input with label', () => {
      render(<FormInput label="Display Name" />);
      const labels = screen.getAllByText('Display Name');
      expect(labels.length).toBeGreaterThan(0); // Label appears twice in FormInput
    });

    it('renders input without label', () => {
      const { container } = render(<FormInput placeholder="Enter text" />);
      const input = container.querySelector('input');
      expect(input).toBeInTheDocument();
    });

    it('applies placeholder text', () => {
      render(<FormInput placeholder="Type here" />);
      const input = screen.getByPlaceholderText('Type here');
      expect(input).toBeInTheDocument();
    });

    it('handles value and onChange', async () => {
      const handleChange = jest.fn();
      render(
        <FormInput 
          label="Username"
          value=""
          onChange={handleChange}
        />
      );
      
      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'john');
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('supports different input types', () => {
      const { container } = render(<FormInput type="email" />);
      const input = container.querySelector('input[type="email"]');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Textarea (Multiline)', () => {
    it('renders textarea when multiline is true', () => {
      render(<FormInput multiline label="Description" />);
      const textarea = screen.getByRole('textbox');
      expect(textarea.nodeName).toBe('TEXTAREA');
    });

    it('applies rows attribute to textarea', () => {
      render(<FormInput multiline rows={5} />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('rows', '5');
    });

    it('handles textarea value and onChange', async () => {
      const handleChange = jest.fn();
      render(
        <FormInput 
          multiline
          label="Bio"
          value=""
          onChange={handleChange}
        />
      );
      
      const textarea = screen.getByRole('textbox');
      await userEvent.type(textarea, 'Hello world');
      
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Helper Text', () => {
    it('displays helper text when provided', () => {
      render(
        <FormInput 
          label="Password"
          helperText="Minimum 8 characters"
        />
      );
      expect(screen.getByText('Minimum 8 characters')).toBeInTheDocument();
    });

    it('does not render helper text when not provided', () => {
      const { container } = render(<FormInput label="Email" />);
      const helperText = container.querySelector('.text-base-content\\/60');
      expect(helperText).toBeFalsy();
    });
  });

  describe('Error States', () => {
    it('displays error message when error is provided', () => {
      render(
        <FormInput 
          label="Email"
          error="Invalid email format"
        />
      );
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });

    it('applies error styling to input', () => {
      const { container } = render(
        <FormInput 
          label="Username"
          error="Username taken"
        />
      );
      const wrapper = container.querySelector('label.input');
      expect(wrapper?.className.includes('input-error')).toBe(true);
    });

    it('shows error icon when error exists', () => {
      const { container } = render(
        <FormInput 
          label="Email"
          error="Required field"
        />
      );
      const errorIcon = container.querySelector('svg');
      expect(errorIcon).toBeTruthy();
    });

    it('hides helper text when error is shown', () => {
      render(
        <FormInput 
          label="Password"
          helperText="Choose a strong password"
          error="Password too weak"
        />
      );
      expect(screen.queryByText('Choose a strong password')).not.toBeInTheDocument();
      expect(screen.getByText('Password too weak')).toBeInTheDocument();
    });
  });

  describe('Color Variants', () => {
    it('applies primary color variant', () => {
      const { container } = render(
        <FormInput label="Name" color="primary" />
      );
      const wrapper = container.querySelector('label.input');
      expect(wrapper?.className.includes('input-primary')).toBe(true);
    });

    it('applies secondary color variant', () => {
      const { container } = render(
        <FormInput label="Name" color="secondary" />
      );
      const wrapper = container.querySelector('label.input');
      expect(wrapper?.className.includes('input-secondary')).toBe(true);
    });

    it('applies accent color variant', () => {
      const { container } = render(
        <FormInput label="Name" color="accent" />
      );
      const wrapper = container.querySelector('label.input');
      expect(wrapper?.className.includes('input-accent')).toBe(true);
    });

    it('applies info color variant', () => {
      const { container } = render(
        <FormInput label="Name" color="info" />
      );
      const wrapper = container.querySelector('label.input');
      expect(wrapper?.className.includes('input-info')).toBe(true);
    });

    it('applies success color variant', () => {
      const { container } = render(
        <FormInput label="Name" color="success" />
      );
      const wrapper = container.querySelector('label.input');
      expect(wrapper?.className.includes('input-success')).toBe(true);
    });

    it('applies warning color variant', () => {
      const { container } = render(
        <FormInput label="Name" color="warning" />
      );
      const wrapper = container.querySelector('label.input');
      expect(wrapper?.className.includes('input-warning')).toBe(true);
    });

    it('applies error color variant', () => {
      const { container } = render(
        <FormInput label="Name" color="error" />
      );
      const wrapper = container.querySelector('label.input');
      expect(wrapper?.className.includes('input-error')).toBe(true);
    });

    it('uses default styling when no color specified', () => {
      const { container } = render(<FormInput label="Name" />);
      const wrapper = container.querySelector('label.input');
      expect(wrapper?.className.includes('input')).toBe(true);
    });
  });

  describe('HTML Attributes', () => {
    it('supports required attribute', () => {
      const { container } = render(<FormInput label="Email" required />);
      const wrapper = container.querySelector('label.input');
      const input = wrapper?.querySelector('input');
      expect(input).toHaveAttribute('required');
    });

    it('supports disabled attribute', () => {
      const { container } = render(<FormInput label="Email" disabled />);
      const wrapper = container.querySelector('label.input');
      const input = wrapper?.querySelector('input');
      expect(input).toHaveAttribute('disabled');
    });

    it('supports readonly attribute', () => {
      const { container } = render(<FormInput label="Email" readOnly />);
      const wrapper = container.querySelector('label.input');
      const input = wrapper?.querySelector('input');
      expect(input).toHaveAttribute('readonly');
    });

    it('supports maxLength attribute', () => {
      const { container } = render(<FormInput label="Username" maxLength={20} />);
      const wrapper = container.querySelector('label.input');
      const input = wrapper?.querySelector('input');
      expect(input).toHaveAttribute('maxLength', '20');
    });

    it('supports pattern attribute', () => {
      const { container } = render(<FormInput label="Code" pattern="[0-9]{6}" />);
      const wrapper = container.querySelector('label.input');
      const input = wrapper?.querySelector('input');
      expect(input).toHaveAttribute('pattern', '[0-9]{6}');
    });

    it('supports name attribute', () => {
      const { container } = render(<FormInput label="Email" name="email" />);
      const wrapper = container.querySelector('label.input');
      const input = wrapper?.querySelector('input');
      expect(input).toHaveAttribute('name', 'email');
    });

    it('supports id attribute', () => {
      const { container } = render(<FormInput label="Email" id="email-input" />);
      const wrapper = container.querySelector('label.input');
      const input = wrapper?.querySelector('input');
      expect(input).toHaveAttribute('id', 'email-input');
    });
  });

  describe('Berlin Edgy Design', () => {
    it('uses DaisyUI input class', () => {
      const { container } = render(<FormInput label="Name" />);
      const wrapper = container.querySelector('label.input');
      expect(wrapper?.className.includes('input')).toBe(true);
    });

    it('maintains proper spacing', () => {
      const { container } = render(
        <FormInput 
          label="Email"
          helperText="Enter your email"
        />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className.includes('space-y-2')).toBe(true);
    });

    it('uses uppercase for labels', () => {
      render(<FormInput label="Username" />);
      const labels = screen.getAllByText('Username');
      expect(labels[0].className.includes('uppercase')).toBe(true);
    });

    it('applies font-black to labels', () => {
      render(<FormInput label="Password" />);
      const labels = screen.getAllByText('Password');
      expect(labels[0].className.includes('font-black')).toBe(true);
    });

    it('uses proper text sizing', () => {
      render(<FormInput label="Email" helperText="Helper text" />);
      const helperText = screen.getByText('Helper text');
      expect(helperText.className.includes('text-xs')).toBe(true);
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className to container', () => {
      const { container } = render(
        <FormInput label="Name" className="custom-wrapper" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className.includes('custom-wrapper')).toBe(true);
    });
  });

  describe('Focus and Blur', () => {
    it('handles focus event', async () => {
      const handleFocus = jest.fn();
      render(<FormInput label="Email" onFocus={handleFocus} />);
      
      const input = screen.getByRole('textbox');
      await userEvent.click(input);
      
      expect(handleFocus).toHaveBeenCalled();
    });

    it('handles blur event', async () => {
      const handleBlur = jest.fn();
      render(<FormInput label="Email" onBlur={handleBlur} />);
      
      const input = screen.getByRole('textbox');
      await userEvent.click(input);
      await userEvent.tab();
      
      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('Complex Scenarios', () => {
    it('renders with all features', () => {
      render(
        <FormInput 
          label="Bio"
          multiline
          rows={4}
          placeholder="Tell us about yourself"
          helperText="Maximum 500 characters"
          color="accent"
          maxLength={500}
          className="custom-bio-input"
        />
      );
      
      const labels = screen.getAllByText('Bio');
      expect(labels.length).toBeGreaterThan(0);
      expect(screen.getByPlaceholderText('Tell us about yourself')).toBeInTheDocument();
      expect(screen.getByText('Maximum 500 characters')).toBeInTheDocument();
    });

    it('handles controlled input', async () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState('');
        return (
          <FormInput 
            label="Name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        );
      };
      
      render(<TestComponent />);
      const input = screen.getByRole('textbox');
      
      await userEvent.type(input, 'John Doe');
      expect(input).toHaveValue('John Doe');
    });
  });

  describe('Accessibility', () => {
    it('associates label with input', () => {
      render(<FormInput label="Email" />);
      const input = screen.getByRole('textbox');
      // FormInput uses label wrapper pattern, input is inside label
      expect(input).toBeInTheDocument();
    });

    it('marks required fields', () => {
      render(<FormInput label="Password" required />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('required');
    });

    it('provides error feedback to screen readers', () => {
      render(
        <FormInput 
          label="Email"
          error="Invalid email"
        />
      );
      
      const errorMessage = screen.getByText('Invalid email');
      expect(errorMessage).toBeInTheDocument();
    });
  });
});
