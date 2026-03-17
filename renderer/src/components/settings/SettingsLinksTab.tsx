import React from 'react';
import { LINK_DISPLAY_NAME_TO_KEY, LinkIcon } from '../GameLinks';
import { SettingsSection } from './SettingsComponents';

interface SettingsLinksTabProps {
  linkDisplayOrder: string[];
  linkVisibleTypes: Record<string, boolean>;
  onSetLinkDisplayOrder: React.Dispatch<React.SetStateAction<string[]>>;
  onSetLinkVisibleTypes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export const SettingsLinksTab: React.FC<SettingsLinksTabProps> = ({
  linkDisplayOrder,
  linkVisibleTypes,
  onSetLinkDisplayOrder,
  onSetLinkVisibleTypes,
}) => {
  return (
    <div className="space-y-6 p-6">
      <SettingsSection
        title="Link Management"
        description="Choose which link types appear on the game bar and in what order. Hidden-by-default links still appear in the right-click icon menu."
      >
        <div className="space-y-1">
          {linkDisplayOrder.map((displayName, index) => {
            const key = LINK_DISPLAY_NAME_TO_KEY[displayName] || displayName.toLowerCase().replace(/\s+/g, '');
            const isVisible = linkVisibleTypes[key] === true;
            const hiddenByDefault = !isVisible;
            return (
              <div
                key={displayName}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (index <= 0) return;
                      onSetLinkDisplayOrder((current) => {
                        const next = [...current];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        return next;
                      });
                    }}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded"
                    title="Move up"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (index >= linkDisplayOrder.length - 1) return;
                      onSetLinkDisplayOrder((current) => {
                        const next = [...current];
                        [next[index], next[index + 1]] = [next[index + 1], next[index]];
                        return next;
                      });
                    }}
                    disabled={index === linkDisplayOrder.length - 1}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded"
                    title="Move down"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
                <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-white">
                  <LinkIcon iconKey={key} className="w-[70%] h-[70%]" darkBackground={true} />
                </div>
                <span className="flex-1 text-sm text-white truncate">{displayName}</span>
                <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
                  <span className="text-xs text-gray-400">Hidden by default</span>
                  <input
                    type="checkbox"
                    checked={hiddenByDefault}
                    onChange={() => onSetLinkVisibleTypes((current) => ({ ...current, [key]: !isVisible }))}
                    className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                  />
                </label>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">Changes are saved when you click Save. Hidden-by-default links still appear when you right-click the link icons.</p>
      </SettingsSection>
    </div>
  );
};
