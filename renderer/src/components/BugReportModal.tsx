import React, { useState } from 'react';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose }) => {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ filePath: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      setError('Please describe what went wrong');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.electronAPI.generateBugReport(description.trim());
      
      if (result.success && result.filePath) {
        setSuccess({ filePath: result.filePath });
        setDescription(''); // Clear description after success
      } else {
        setError(result.error || 'Failed to generate bug report');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate bug report');
      console.error('Error generating bug report:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setDescription('');
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  const handleOpenLogsFolder = async () => {
    try {
      const result = await window.electronAPI.getBugReportLogsDirectory();
      if (result.success && result.path) {
        // Open the folder using the openPath method
        await window.electronAPI.openPath(result.path);
      }
    } catch (err) {
      console.error('Error opening logs folder:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal - Centered */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div 
          className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-600/20">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Report a Bug</h2>
            <button
              onClick={handleClose}
              disabled={isGenerating}
              className="ml-auto text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4 flex-1 overflow-y-auto">
            {success ? (
              <div className="space-y-4">
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="text-green-400 font-semibold mb-1">Bug Report Generated Successfully!</h3>
                      <p className="text-gray-300 text-sm mb-3">
                        The bug report has been saved to:
                      </p>
                      <code className="block text-xs text-gray-400 bg-gray-900/50 p-2 rounded break-all mb-3">
                        {success.filePath}
                      </code>
                      <p className="text-gray-400 text-sm">
                        You can share this file to help fix the issue. The report includes system information, app state, recent errors, and console logs.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleOpenLogsFolder}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    Open Logs Folder
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                    What went wrong?
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue you encountered, what you were doing when it happened, and any steps to reproduce it..."
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={8}
                    disabled={isGenerating}
                  />
                </div>

                {error && (
                  <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                )}

                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-gray-400">
                      <p className="mb-1">The bug report will include:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-500">
                        <li>System information (OS, hardware, memory)</li>
                        <li>App version and configuration</li>
                        <li>Game library statistics</li>
                        <li>Recent errors and console logs</li>
                        <li>Your description above</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
          
          {/* Actions */}
          {!success && (
            <div className="px-6 py-4 border-t border-gray-700 flex gap-3 justify-end flex-shrink-0">
              <button
                onClick={handleClose}
                disabled={isGenerating}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isGenerating || !description.trim()}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Report
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
