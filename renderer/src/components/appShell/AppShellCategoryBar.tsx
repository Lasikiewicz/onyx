import type { CSSProperties } from 'react';

interface AppShellCategoryBarProps {
  alignment: 'left' | 'center' | 'right';
  hasFavoriteGames: boolean;
  pinnedCategories: string[];
  selectedCategory: string | null;
  size: number;
  onCategoryChange: (category: string | null) => void;
}

const categoryBarDragStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties & { WebkitAppRegion: string };

function getCategoryButtonClass(isSelected: boolean) {
  return `px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${
    isSelected
      ? 'bg-blue-600/40 text-blue-100 border border-blue-500/40 shadow-sm shadow-blue-500/20'
      : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-gray-200 border border-gray-700/20'
  }`;
}

export function AppShellCategoryBar({
  alignment,
  hasFavoriteGames,
  pinnedCategories,
  selectedCategory,
  size,
  onCategoryChange,
}: AppShellCategoryBarProps) {
  if (pinnedCategories.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 px-6 py-4 overflow-x-auto no-scrollbar flex-shrink-0 ${
        alignment === 'center' ? 'justify-center' : alignment === 'right' ? 'justify-end' : 'justify-start'
      }`}
      style={categoryBarDragStyle}
    >
      <button
        onClick={() => onCategoryChange(null)}
        style={{ fontSize: `${size}px` }}
        className={getCategoryButtonClass(selectedCategory === null)}
      >
        All Games
      </button>
      {hasFavoriteGames && (
        <button
          onClick={() => onCategoryChange(selectedCategory === 'favorites' ? null : 'favorites')}
          style={{ fontSize: `${size}px` }}
          className={getCategoryButtonClass(selectedCategory === 'favorites')}
        >
          Favorites
        </button>
      )}
      {pinnedCategories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(selectedCategory === category ? null : category)}
          style={{ fontSize: `${size}px` }}
          className={getCategoryButtonClass(selectedCategory === category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
