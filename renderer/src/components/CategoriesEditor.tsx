import React, { useState, useEffect, useMemo } from 'react';
import { Game } from '../types/game';

interface CategoriesEditorProps {
  isOpen: boolean;
  game: Game | null;
  onClose: () => void;
  onSave: (game: Game) => Promise<void>;
  allCategories?: string[];
}

const DEFAULT_CATEGORIES = ['VR', 'Apps', 'Games'];

export const CategoriesEditor: React.FC<CategoriesEditorProps> = ({ 
  isOpen, 
  game, 
  onClose, 
  onSave, 
  allCategories = [] 
}) => {
  const [editedGame, setEditedGame] = useState<Game | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categoryInput, setCategoryInput] = useState<string>('');
  
  // Combine default categories with existing categories, ensuring defaults are always available
  const availableCategories = useMemo(() => {
    const combined = new Set([...DEFAULT_CATEGORIES, ...allCategories]);
    return Array.from(combined).sort();
  }, [allCategories]);

  useEffect(() => {
    if (game && isOpen) {
      setEditedGame({ ...game });
      setError(null);
      setSuccess(null);
      setCategoryInput('');
    } else if (!isOpen) {
      setEditedGame(null);
      setIsSaving(false);
      setError(null);
      setSuccess(null);
      setCategoryInput('');
    }
  }, [game, isOpen]);

  const addCategory = (category: string) => {
    if (!category.trim() || !editedGame) return;
    const current = editedGame.categories || [];
    if (!current.includes(category.trim())) {
      setEditedGame({ ...editedGame, categories: [...current, category.trim()] });
    }
    setCategoryInput('');
  };

  const removeCategory = (category: string) => {
    if (!editedGame) return;
    const current = editedGame.categories || [];
    setEditedGame({ ...editedGame, categories: current.filter(item => item !== category) });
  };

  const handleSave = async () => {
    if (!editedGame) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await onSave(editedGame);
      setSuccess('Categories updated successfully');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save categories');
      console.error('Error saving categories:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !editedGame) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-2xl font-semibold text-white">Categories - {editedGame.title}</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
              <p className="text-green-300 text-sm">{success}</p>
            </div>
          )}

          {/* Categories Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Categories
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCategory(categoryInput);
                  }
                }}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Add category"
              />
              <button
                type="button"
                onClick={() => addCategory(categoryInput)}
                disabled={isSaving || !categoryInput.trim()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                +
              </button>
            </div>
            
            {/* Existing Categories for Quick Selection */}
            {availableCategories.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-2">Quick select existing categories:</p>
                <div className="flex flex-wrap gap-2">
                  {availableCategories
                    .filter(cat => !editedGame.categories?.includes(cat))
                    .map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => addCategory(category)}
                        disabled={isSaving}
                        className="px-3 py-1 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 rounded text-sm text-gray-300 transition-colors disabled:opacity-50"
                      >
                        + {category}
                      </button>
                    ))}
                </div>
              </div>
            )}
            
            {/* Selected Categories */}
            {editedGame.categories && editedGame.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editedGame.categories.map((category, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600/20 border border-blue-500/50 rounded text-sm text-blue-300"
                  >
                    {category}
                    <button
                      type="button"
                      onClick={() => removeCategory(category)}
                      disabled={isSaving}
                      className="text-blue-300 hover:text-blue-100 disabled:opacity-50"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
