import React from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  note?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger';
  // For two-option dialogs
  primaryActionText?: string;
  secondaryActionText?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  note,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  primaryActionText,
  secondaryActionText,
  onPrimaryAction,
  onSecondaryAction,
}) => {
  if (!isOpen) return null;

  const confirmButtonClass = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';
  
  const hasTwoOptions = !!primaryActionText && !!secondaryActionText && !!onPrimaryAction && !!onSecondaryAction;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal - Centered */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div 
          className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              variant === 'danger' ? 'bg-red-600/20' : 'bg-blue-600/20'
            }`}>
              {variant === 'danger' ? (
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21" />
                </svg>
              )}
            </div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4">
            <p className="text-gray-300 mb-3">{message}</p>
            {note && (
              <div className="text-sm text-gray-400 bg-gray-900/50 border border-gray-700 rounded p-3 flex items-start gap-2">
                <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{note}</span>
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="px-6 py-4 border-t border-gray-700 flex gap-3 justify-end">
            {hasTwoOptions ? (
              <>
                <button
                  onClick={onCancel}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onSecondaryAction}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
                >
                  {secondaryActionText}
                </button>
                <button
                  onClick={onPrimaryAction}
                  className={`px-4 py-2 ${confirmButtonClass} font-medium rounded-lg transition-colors`}
                >
                  {primaryActionText}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onCancel}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  className={`px-4 py-2 ${confirmButtonClass} font-medium rounded-lg transition-colors`}
                >
                  {confirmText}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
