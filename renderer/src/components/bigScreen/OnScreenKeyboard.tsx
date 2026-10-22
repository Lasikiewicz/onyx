import React from 'react';

interface OnScreenKeyboardProps {
  query: string;
  onChange: (value: string) => void;
  onClose: () => void;
}

const ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '-'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', "'", '⌫'],
];

export const OnScreenKeyboard: React.FC<OnScreenKeyboardProps> = ({ query, onChange, onClose }) => {
  const typeKey = (key: string) => {
    if (key === '⌫') {
      onChange(query.slice(0, -1));
      return;
    }
    onChange(`${query}${key}`);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-8"
      data-spatial-root=""
      data-spatial-active="true"
      role="dialog"
      aria-label="On-screen keyboard"
    >
      <div className="w-full max-w-6xl rounded-3xl border border-white/15 bg-slate-950/95 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1 rounded-2xl bg-black/50 px-5 py-4 text-3xl text-white">
            {query || <span className="text-slate-400">Search your library</span>}
          </div>
          <button
            type="button"
            data-spatial-dismiss=""
            onClick={onClose}
            className="rounded-2xl bg-white/10 px-6 py-4 text-2xl font-semibold text-white hover:bg-white/20 focus:outline-none"
          >
            Done
          </button>
        </div>
        <div className="space-y-3">
          {ROWS.map((row) => (
            <div key={row.join('')} className="flex justify-center gap-2">
              {row.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => typeKey(key)}
                  className="h-16 min-w-16 rounded-2xl bg-slate-800 px-4 text-2xl font-semibold text-white hover:bg-slate-700 focus:outline-none"
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => onChange(`${query} `)}
              className="h-16 w-80 rounded-2xl bg-slate-800 text-2xl font-semibold text-white hover:bg-slate-700 focus:outline-none"
            >
              Space
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="h-16 rounded-2xl bg-slate-800 px-8 text-2xl font-semibold text-white hover:bg-slate-700 focus:outline-none"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
