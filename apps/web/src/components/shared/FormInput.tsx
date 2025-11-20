import React, { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';

interface BaseFormInputProps {
  /** Input label */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Color variant */
  color?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
  /** Additional class names for the container */
  className?: string;
}

type FormInputProps = BaseFormInputProps & 
  InputHTMLAttributes<HTMLInputElement> & {
    /** Is textarea */
    multiline?: false;
  };

type FormTextareaProps = BaseFormInputProps & 
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    /** Is textarea */
    multiline: true;
  };

/**
 * FormInput - Consistent form input component
 * Berlin Edgy design with proper validation states
 * 
 * @example
 * // Basic input
 * <FormInput
 *   label="Display Name"
 *   placeholder="Enter your name"
 *   value={displayName}
 *   onChange={(e) => setDisplayName(e.target.value)}
 * />
 * 
 * @example
 * // With error
 * <FormInput
 *   label="Email"
 *   type="email"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   error="Invalid email format"
 * />
 * 
 * @example
 * // With color variant
 * <FormInput
 *   label="Username"
 *   color="secondary"
 *   helperText="Choose a unique username"
 * />
 * 
 * @example
 * // Textarea
 * <FormInput
 *   multiline
 *   label="Description"
 *   rows={4}
 *   placeholder="Enter description..."
 * />
 */
export function FormInput(props: FormInputProps | FormTextareaProps) {
  const {
    label,
    helperText,
    error,
    color,
    className = '',
    multiline,
    ...restProps
  } = props;

  const colorClass = color ? `input-${color}` : '';
  const errorClass = error ? 'input-error' : '';

  const inputClass = `input w-full ${colorClass} ${errorClass}`;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {label && (
        <label className="label">
          <span className="text-xs font-black uppercase tracking-widest text-base-content/70">
            {label}
          </span>
        </label>
      )}

      {/* Input/Textarea Container */}
      <label className={multiline ? 'textarea w-full' : inputClass}>
        {label && multiline && (
          <span className="text-xs font-black uppercase tracking-widest text-base-content/50">
            {label}
          </span>
        )}
        
        {multiline ? (
          <textarea
            {...(restProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            className={`w-full bg-transparent outline-none ${error ? 'text-error' : ''}`}
          />
        ) : (
          <>
            {label && (
              <span className="text-xs font-black uppercase tracking-widest text-base-content/50">
                {label}
              </span>
            )}
            <input
              {...(restProps as InputHTMLAttributes<HTMLInputElement>)}
              className="bg-transparent outline-none w-full"
            />
          </>
        )}
      </label>

      {/* Helper Text or Error */}
      {(helperText || error) && (
        <div className="flex items-start gap-2 px-2">
          {error && (
            <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" strokeWidth={2} />
          )}
          <p className={`text-xs ${error ? 'text-error' : 'text-base-content/60'}`}>
            {error || helperText}
          </p>
        </div>
      )}
    </div>
  );
}
