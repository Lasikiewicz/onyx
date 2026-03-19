interface RightClickMenuViewModeSwitchProps {
  viewMode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow';
  onViewModeChange: (mode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow') => void;
}

const viewModes = [
  {
    mode: 'grid',
    label: 'Grid',
    title: 'Grid View',
    path: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  },
  {
    mode: 'list',
    label: 'List',
    title: 'List View',
    path: 'M4 6h16M4 12h16M4 18h16',
  },
  {
    mode: 'logo',
    label: 'Logo',
    title: 'Logo View',
    path: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
  },
  {
    mode: 'carousel',
    label: 'Carousel',
    title: 'Carousel View',
    path: 'M4 8h16M4 16h16',
  },
  {
    mode: 'coverflow',
    label: 'Cover Flow',
    title: 'Cover Flow View',
    path: 'M4 6h3v12H4V6zM10.5 4h3v16h-3V4zM17 6h3v12h-3V6z',
  },
] as const;

export function RightClickMenuViewModeSwitch({
  viewMode,
  onViewModeChange,
}: RightClickMenuViewModeSwitchProps) {
  return (
    <div className="px-3 py-1 grid grid-cols-5 gap-1.5">
      {viewModes.map(({ mode, label, title, path }) => (
        <button
          key={mode}
          onClick={() => onViewModeChange(mode)}
          className={`px-2 py-1.5 text-xs rounded transition-colors flex flex-col items-center gap-0.5 font-medium ${
            viewMode === mode
              ? 'bg-blue-600/40 text-white border border-blue-500'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
          }`}
          title={title}
        >
          <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
          </svg>
          {label}
        </button>
      ))}
    </div>
  );
}
