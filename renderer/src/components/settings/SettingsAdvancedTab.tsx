import React from 'react';

export interface SettingsDestructiveConfirmationState {
  step: number;
  typedText: string;
}

interface SettingsAdvancedTabProps {
  removeGamesConfirmation: SettingsDestructiveConfirmationState;
  isRemovingGames: boolean;
  onRemoveAllGames: () => void | Promise<void>;
  onSetRemoveGamesConfirmation: React.Dispatch<React.SetStateAction<SettingsDestructiveConfirmationState>>;
  resetConfirmation: SettingsDestructiveConfirmationState;
  isResetting: boolean;
  onReset: () => void | Promise<void>;
  onSetResetConfirmation: React.Dispatch<React.SetStateAction<SettingsDestructiveConfirmationState>>;
}

const openSystemPath = async (pathKey: 'cache' | 'appData') => {
  try {
    if (window.electronAPI.openPath) {
      await window.electronAPI.openPath(pathKey);
    } else {
      alert('Open folder functionality not available');
    }
  } catch (error) {
    console.error('Error opening folder:', error);
  }
};

export const SettingsAdvancedTab: React.FC<SettingsAdvancedTabProps> = ({
  removeGamesConfirmation,
  isRemovingGames,
  onRemoveAllGames,
  onSetRemoveGamesConfirmation,
  resetConfirmation,
  isResetting,
  onReset,
  onSetResetConfirmation,
}) => {
  return (
    <div className="space-y-8 p-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-white mb-2">Advanced Settings</h3>
        <p className="text-gray-400 text-sm">
          Manage system folders and dangerous settings.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="text-base font-medium text-white">System Folders</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600 hover:bg-gray-700/50 transition-colors">
            <div className="flex-1 min-w-0 pr-3">
              <h4 className="text-xs font-medium text-white mb-0.5">Image Cache</h4>
              <p className="text-xs text-gray-500 font-mono truncate">Cache Directory</p>
            </div>
            <button
              type="button"
              onClick={() => void openSystemPath('cache')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600 hover:bg-gray-700/50 transition-colors">
            <div className="flex-1 min-w-0 pr-3">
              <h4 className="text-xs font-medium text-white mb-0.5">Application Data</h4>
              <p className="text-xs text-gray-500 font-mono truncate">Config Directory</p>
            </div>
            <button
              type="button"
              onClick={() => void openSystemPath('appData')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-6 border-t border-gray-700">
        <h4 className="text-base font-medium text-red-400">Danger Zone</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white mb-2">Remove All Games</h3>
              <p className="text-gray-400 text-sm mb-4">
                Clear your game library while keeping all app settings and configurations.
              </p>
              <div className="bg-orange-900/20 border-2 border-orange-500/50 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-orange-400 font-semibold mb-2">This will permanently delete:</h4>
                    <ul className="list-disc list-inside text-orange-300 text-sm space-y-1">
                      <li>All games in your library</li>
                      <li>All game metadata and images</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                {removeGamesConfirmation.step === 1 && (
                  <button
                    type="button"
                    onClick={() => void onRemoveAllGames()}
                    className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    Remove All Games
                  </button>
                )}
                {removeGamesConfirmation.step === 2 && (
                  <div className="space-y-3">
                    <p className="text-gray-300 text-sm font-medium">Type <span className="text-orange-400 font-bold">DELETE</span> to confirm:</p>
                    <input
                      type="text"
                      value={removeGamesConfirmation.typedText}
                      onChange={(event) => onSetRemoveGamesConfirmation((current) => ({
                        ...current,
                        typedText: event.target.value,
                      }))}
                      placeholder="Type DELETE"
                      className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-600 rounded-lg text-white text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onSetRemoveGamesConfirmation({ step: 1, typedText: '' })}
                        className="flex-1 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void onRemoveAllGames()}
                        disabled={removeGamesConfirmation.typedText !== 'DELETE'}
                        className="flex-1 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 text-sm"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}
                {removeGamesConfirmation.step === 3 && (
                  <div className="space-y-3">
                    <p className="text-yellow-300 text-sm font-medium">Final Confirmation: Delete all games?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onSetRemoveGamesConfirmation({ step: 1, typedText: '' })}
                        className="flex-1 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void onRemoveAllGames()}
                        disabled={isRemovingGames}
                        className="flex-1 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
                      >
                        {isRemovingGames ? 'Removing...' : 'Remove Now'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-white mb-2">Reset Application</h3>
              <p className="text-gray-400 text-sm mb-4">
                Completely reset Onyx to its initial installation state.
              </p>
              <div className="bg-red-900/20 border-2 border-red-500/50 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-red-400 font-semibold mb-2">This will permanently delete EVERYTHING:</h4>
                    <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
                      <li>All games, metadata, and images</li>
                      <li>All app configurations and settings</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                {resetConfirmation.step === 1 && (
                  <button
                    type="button"
                    onClick={() => void onReset()}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm"
                  >
                    Factory Reset
                  </button>
                )}
                {resetConfirmation.step === 2 && (
                  <div className="space-y-3">
                    <p className="text-gray-300 text-sm font-medium">Type <span className="text-red-400 font-bold">RESET</span> to confirm:</p>
                    <input
                      type="text"
                      value={resetConfirmation.typedText}
                      onChange={(event) => onSetResetConfirmation((current) => ({
                        ...current,
                        typedText: event.target.value,
                      }))}
                      placeholder="Type RESET"
                      className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-600 rounded-lg text-white text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onSetResetConfirmation({ step: 1, typedText: '' })}
                        className="flex-1 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void onReset()}
                        disabled={resetConfirmation.typedText !== 'RESET'}
                        className="flex-1 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 text-sm"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}
                {resetConfirmation.step === 3 && (
                  <div className="space-y-3">
                    <p className="text-yellow-300 text-sm font-medium">Final Confirmation: Reset everything?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onSetResetConfirmation({ step: 1, typedText: '' })}
                        className="flex-1 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void onReset()}
                        disabled={isResetting}
                        className="flex-1 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                      >
                        {isResetting ? 'Resetting...' : 'Reset Now'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
