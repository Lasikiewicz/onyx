import React from 'react';

interface LeftSidebarProps {
  onNavigate?: (section: string) => void;
  onMenuToggle?: () => void;
  activeSection?: string;
  isMenuOpen?: boolean;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  onNavigate, 
  onMenuToggle,
  activeSection = 'library',
  isMenuOpen = false,
}) => {
  const sections = [
    { id: 'library', icon: '🎮', label: 'Library' },
    { id: 'favorites', icon: '⭐', label: 'Favorites' },
    { id: 'recent', icon: '🕐', label: 'Recent' },
    { id: 'folders', icon: '📁', label: 'Folders' },
    { id: 'home', icon: '🏠', label: 'Home' },
  ];

  return (
    <div className="w-16 bg-gray-800/90 backdrop-blur-sm border-r border-gray-700 flex flex-col items-center py-4 gap-4 flex-shrink-0">
      {/* Onyx Logo/Icon - Menu Toggle */}
      <button
        onClick={onMenuToggle}
        className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
          isMenuOpen
            ? 'bg-blue-600 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
        title="Menu"
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      </button>

      <div className="w-8 border-t border-gray-700" />

      {/* Navigation Icons */}
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onNavigate?.(section.id)}
          className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
            activeSection === section.id
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
          title={section.label}
        >
          <span className="text-2xl">{section.icon}</span>
        </button>
      ))}
    </div>
  );
};
