/**
 * Toast - DaisyUI toast notification system
 * Berlin Edgy design with sharp corners
 * 
 * @example
 * // Show success toast
 * toast.success('Changes saved successfully!');
 * 
 * @example
 * // Show error toast
 * toast.error('Failed to save changes');
 * 
 * @example
 * // Show info toast
 * toast.info('New message received');
 * 
 * @example
 * // Show warning toast
 * toast.warning('Your session will expire soon');
 * 
 * @example
 * // Custom duration (default 3000ms)
 * toast.success('Quick message', { duration: 1500 });
 */

import { createRoot } from 'react-dom/client';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  /** Duration in milliseconds (default: 3000) */
  duration?: number;
  /** Toast position (default: 'top-right') */
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

interface ToastConfig extends ToastOptions {
  id: string;
  type: ToastType;
  message: string;
}

class ToastManager {
  private container: HTMLDivElement | null = null;
  private toasts: Map<string, ToastConfig> = new Map();
  private roots: Map<string, ReturnType<typeof createRoot>> = new Map();

  private getContainer(position: ToastOptions['position'] = 'top-right'): HTMLDivElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast';
      
      // Position classes
      const positionClasses = {
        'top-left': 'toast-top toast-start',
        'top-center': 'toast-top toast-center',
        'top-right': 'toast-top toast-end',
        'bottom-left': 'toast-bottom toast-start',
        'bottom-center': 'toast-bottom toast-center',
        'bottom-right': 'toast-bottom toast-end',
      };
      
      this.container.className = `toast ${positionClasses[position]}`;
      this.container.style.zIndex = '9999';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  private show(type: ToastType, message: string, options: ToastOptions = {}) {
    const { duration = 3000, position = 'top-right' } = options;
    const id = `toast-${Date.now()}-${Math.random()}`;
    
    const config: ToastConfig = {
      id,
      type,
      message,
      duration,
      position,
    };
    
    this.toasts.set(id, config);
    this.render(config);
    
    // Auto-dismiss after duration
    setTimeout(() => {
      this.dismiss(id);
    }, duration);
  }

  private render(config: ToastConfig) {
    const container = this.getContainer(config.position);
    
    // Create toast element
    const toastEl = document.createElement('div');
    toastEl.id = config.id;
    container.appendChild(toastEl);
    
    const ToastComponent = () => {
      const icons = {
        success: <CheckCircle2 className="w-5 h-5 stroke-current" strokeWidth={2} />,
        error: <AlertCircle className="w-5 h-5 stroke-current" strokeWidth={2} />,
        info: <Info className="w-5 h-5 stroke-current" strokeWidth={2} />,
        warning: <AlertTriangle className="w-5 h-5 stroke-current" strokeWidth={2} />,
      };

      const alertClasses = {
        success: 'alert-success',
        error: 'alert-error',
        info: 'alert-info',
        warning: 'alert-warning',
      };

      return (
        <div className={`alert ${alertClasses[config.type]} shadow-lg border-2 border-current/20`}>
          <div className="flex items-center gap-3 w-full">
            {icons[config.type]}
            <span className="text-sm font-medium flex-1">{config.message}</span>
            <button
              onClick={() => this.dismiss(config.id)}
              className="btn btn-ghost btn-xs btn-square"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      );
    };
    
    // Render React component
    const root = createRoot(toastEl);
    root.render(<ToastComponent />);
    this.roots.set(config.id, root);
  }

  private dismiss(id: string) {
    const toastEl = document.getElementById(id);
    if (toastEl) {
      // Fade out animation
      toastEl.style.transition = 'opacity 200ms ease-out';
      toastEl.style.opacity = '0';
      
      setTimeout(() => {
        const root = this.roots.get(id);
        if (root) {
          root.unmount();
          this.roots.delete(id);
        }
        toastEl.remove();
        this.toasts.delete(id);
        
        // Clean up container if no more toasts
        if (this.toasts.size === 0 && this.container) {
          this.container.remove();
          this.container = null;
        }
      }, 200);
    }
  }

  success(message: string, options?: ToastOptions) {
    this.show('success', message, options);
  }

  error(message: string, options?: ToastOptions) {
    this.show('error', message, options);
  }

  info(message: string, options?: ToastOptions) {
    this.show('info', message, options);
  }

  warning(message: string, options?: ToastOptions) {
    this.show('warning', message, options);
  }

  dismissAll() {
    this.toasts.forEach((_, id) => this.dismiss(id));
  }
}

// Export singleton instance
export const toast = new ToastManager();
