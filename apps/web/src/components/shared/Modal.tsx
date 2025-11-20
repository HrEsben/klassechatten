import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  /** Modal ID (required for dialog element) */
  id: string;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Show modal */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Footer actions */
  actions?: React.ReactNode;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Allow clicking backdrop to close */
  closeOnBackdrop?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Modal - Consistent modal dialog component
 * Uses HTML dialog element for native modal behavior
 * Berlin Edgy design with sharp edges
 * 
 * @example
 * // Basic modal
 * <Modal
 *   id="my-modal"
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Confirm Action"
 * >
 *   <p>Are you sure you want to continue?</p>
 * </Modal>
 * 
 * @example
 * // With actions
 * <Modal
 *   id="confirm-modal"
 *   open={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   title="Delete User"
 *   actions={
 *     <>
 *       <button className="btn btn-ghost" onClick={() => setShowConfirm(false)}>
 *         Cancel
 *       </button>
 *       <button className="btn btn-error" onClick={handleDelete}>
 *         Delete
 *       </button>
 *     </>
 *   }
 * >
 *   <p>This action cannot be undone.</p>
 * </Modal>
 * 
 * @example
 * // Large modal
 * <Modal
 *   id="details-modal"
 *   open={showDetails}
 *   onClose={() => setShowDetails(false)}
 *   size="lg"
 *   title="User Details"
 * >
 *   <div className="space-y-4">
 *     Content here
 *   </div>
 * </Modal>
 */
export function Modal({
  id,
  title,
  children,
  open,
  onClose,
  actions,
  size = 'md',
  closeOnBackdrop = true,
  className = '',
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Handle modal open/close
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (!closeOnBackdrop) return;
    
    const dialog = dialogRef.current;
    if (!dialog) return;

    const rect = dialog.getBoundingClientRect();
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;

    if (!isInDialog) {
      onClose();
    }
  };

  // Handle close event
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };

    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <dialog
      ref={dialogRef}
      id={id}
      className={`modal ${className}`}
      onClick={handleBackdropClick}
    >
      <div className={`modal-box ${sizeClasses[size]} bg-base-100 border-2 border-base-content/10 shadow-lg p-0 max-h-[90vh] flex flex-col`}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b-2 border-base-content/10">
            <h2 className="text-xl font-black uppercase tracking-tight text-base-content">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-square btn-sm"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer Actions */}
        {actions && (
          <div className="flex items-center justify-end gap-2 p-6 border-t-2 border-base-content/10">
            {actions}
          </div>
        )}
      </div>

      {/* Backdrop */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose} aria-label="Close modal">close</button>
      </form>
    </dialog>
  );
}
