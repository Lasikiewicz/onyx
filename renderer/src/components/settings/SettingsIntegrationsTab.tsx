import React from 'react';
import { SettingsInput } from './SettingsComponents';

type APITabType = 'igdb' | 'rawg' | 'steamgriddb' | 'giantbomb';

interface APICredentials {
  igdbClientId: string;
  igdbClientSecret: string;
  rawgApiKey: string;
  steamGridDBApiKey: string;
  giantBombApiKey: string;
}

interface APIStatus {
  igdbConfigured: boolean;
  rawgConfigured: boolean;
  steamGridDBConfigured: boolean;
  giantBombConfigured: boolean;
}

interface SettingsIntegrationsTabProps {
  activeAPITab: APITabType;
  apiCredentials: APICredentials;
  apiStatus: APIStatus;
  onActiveTabChange: (tab: APITabType) => void;
  onAPIInputChange: (key: keyof APICredentials, value: string) => void;
  onOpenExternal: (url: string) => void;
}

export const SettingsIntegrationsTab: React.FC<SettingsIntegrationsTabProps> = ({
  activeAPITab,
  apiCredentials,
  apiStatus,
  onActiveTabChange,
  onAPIInputChange,
  onOpenExternal,
}) => {
  return (
    <>
      <div className="space-y-6 animate-fade-in p-6">
        <div className="space-y-1 mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">API Integrations</h3>
          <p className="text-gray-400 text-sm">
            Configure external services for metadata and images.
          </p>
        </div>

        <div className="flex space-x-6 border-b border-gray-700/50 mb-6">
          {(['steamgriddb', 'igdb', 'rawg', 'giantbomb'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onActiveTabChange(tab)}
              className={`pb-3 text-sm font-medium transition-all duration-200 border-b-2 capitalize relative ${activeAPITab === tab
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
            >
              <div className="flex items-center gap-2">
                {tab === 'steamgriddb' ? 'SteamGridDB (Mandatory)' :
                  tab === 'igdb' ? 'IGDB (Optional)' :
                    tab === 'rawg' ? 'RAWG (Optional)' :
                      'Giant Bomb (Unavailable)'}
                {((tab === 'igdb' && apiStatus.igdbConfigured) ||
                  (tab === 'steamgriddb' && apiStatus.steamGridDBConfigured) ||
                  (tab === 'rawg' && apiStatus.rawgConfigured)) && (
                    <svg className="w-3.5 h-3.5 text-green-500 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
              </div>
            </button>
          ))}
        </div>

        <div className="animate-fade-in">
          {activeAPITab === 'steamgriddb' && (
            <div className="space-y-6">
              <SettingsInput
                label="API Key"
                value={apiCredentials.steamGridDBApiKey}
                onChange={(val) => onAPIInputChange('steamGridDBApiKey', val)}
                placeholder="SteamGridDB API Key"
                type="password"
                description="Required for searching games and fetching artwork."
              />
            </div>
          )}

          {activeAPITab === 'igdb' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SettingsInput
                  label="Client ID"
                  value={apiCredentials.igdbClientId}
                  onChange={(val) => onAPIInputChange('igdbClientId', val)}
                  placeholder="IGDB Client ID"
                  description="Optional game metadata"
                />
                <SettingsInput
                  label="Client Secret"
                  value={apiCredentials.igdbClientSecret}
                  onChange={(val) => onAPIInputChange('igdbClientSecret', val)}
                  placeholder="IGDB Client Secret"
                  type="password"
                  description="Keep this secret safe"
                />
              </div>
            </div>
          )}

          {activeAPITab === 'rawg' && (
            <div className="space-y-6">
              <SettingsInput
                label="API Key"
                value={apiCredentials.rawgApiKey}
                onChange={(val) => onAPIInputChange('rawgApiKey', val)}
                placeholder="RAWG API Key"
                type="password"
                description="Alternative metadata source (Optional)"
              />
            </div>
          )}

          {activeAPITab === 'giantbomb' && (
            <div className="space-y-6">
              <div className="p-4 bg-red-900/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-red-400 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-red-400 font-medium">API Currently Unavailable</span>
                </div>
                <p className="text-sm text-red-300">
                  Giant Bomb is rebuilding their API infrastructure after becoming independent from Fandom. The API is temporarily offline while they migrate their tech stack.
                </p>
              </div>
              <SettingsInput
                label="API Key (When Available)"
                value={apiCredentials.giantBombApiKey}
                onChange={(val) => onAPIInputChange('giantBombApiKey', val)}
                placeholder="Giant Bomb API Key"
                type="password"
                description="Additional metadata and artwork source (Currently Unavailable)"
                disabled={true}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 border-t border-gray-700/50">
        <div className="space-y-6 animate-slide-up">
          {activeAPITab === 'igdb' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <span className="text-sm font-semibold uppercase tracking-wider">Instructions</span>
              </div>
              <h4 className="text-lg font-medium text-white">How to configure IGDB</h4>
              <ol className="space-y-3 list-decimal list-inside text-gray-300 text-sm pl-2">
                <li>Log in to the <button onClick={() => onOpenExternal('https://dev.twitch.tv/console')} className="text-blue-400 hover:text-blue-300 underline">Twitch Developer Console</button></li>
                <li>Click <span className="font-semibold text-white">"Register Your Application"</span></li>
                <li>Name it (e.g. "Onyx"), set Category to <span className="font-semibold text-white">"Game Integration"</span>, and set OAuth Redirect URL to <code className="bg-gray-800/50 px-1.5 py-0.5 rounded text-blue-300">http://localhost</code></li>
                <li>Click <span className="font-semibold text-white">"Create"</span>, then <span className="font-semibold text-white">"Manage"</span></li>
                <li>Copy the <strong className="text-white">Client ID</strong></li>
                <li>Click <span className="font-semibold text-white">"New Secret"</span> to generate a <strong className="text-white">Client Secret</strong></li>
              </ol>
              <div className="p-4 bg-blue-900/10 border border-blue-500/10 rounded-lg mt-4">
                <p className="text-xs text-blue-300">IGDB provides essential metadata like release dates, genres, and summaries.</p>
              </div>
            </div>
          )}

          {activeAPITab === 'steamgriddb' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <span className="text-sm font-semibold uppercase tracking-wider">Instructions</span>
              </div>
              <h4 className="text-lg font-medium text-white">How to configure SteamGridDB</h4>
              <ol className="space-y-3 list-decimal list-inside text-gray-300 text-sm pl-2">
                <li>Log in to the <button onClick={() => onOpenExternal('https://www.steamgriddb.com/profile/preferences/api')} className="text-blue-400 hover:text-blue-300 underline">SteamGridDB API Page</button></li>
                <li>Click the <span className="font-semibold text-white">"Generate API Key"</span> button</li>
                <li>Copy the generated key and paste it into the field above</li>
              </ol>
              <div className="p-4 bg-blue-900/10 border border-blue-500/10 rounded-lg mt-4">
                <p className="text-xs text-blue-300">SteamGridDB is the best source for high-quality vertical covers, heroes, and logos.</p>
              </div>
            </div>
          )}

          {activeAPITab === 'rawg' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <span className="text-sm font-semibold uppercase tracking-wider">Instructions</span>
              </div>
              <h4 className="text-lg font-medium text-white">How to configure RAWG</h4>
              <ol className="space-y-3 list-decimal list-inside text-gray-300 text-sm pl-2">
                <li>Sign up for an account at <button onClick={() => onOpenExternal('https://rawg.io/apidocs')} className="text-blue-400 hover:text-blue-300 underline">RAWG API</button></li>
                <li>Click <span className="font-semibold text-white">"Get API Key"</span> on your profile or API page</li>
                <li>Copy the key and paste it into the field above</li>
              </ol>
              <div className="p-4 bg-blue-900/10 border border-blue-500/10 rounded-lg mt-4">
                <p className="text-xs text-blue-300">RAWG is an optional secondary source for metadata.</p>
              </div>
            </div>
          )}

          {activeAPITab === 'giantbomb' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <span className="text-sm font-semibold uppercase tracking-wider">Status Update</span>
              </div>
              <h4 className="text-lg font-medium text-white">Giant Bomb API Status</h4>
              <div className="p-4 bg-red-900/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-gray-300 mb-3">
                  Giant Bomb has become independent from Fandom and is currently rebuilding their entire tech stack. During this transition, their API is temporarily unavailable.
                </p>
                <p className="text-sm text-gray-300 mb-3">
                  <strong>What this means for Onyx:</strong> The Giant Bomb metadata provider is currently disabled. You can still configure your API key for when the service becomes available again.
                </p>
                <p className="text-sm text-gray-300">
                  <strong>Future plans:</strong> Giant Bomb is working on an open source wiki project. Check <button onClick={() => onOpenExternal('https://bombcast.com/wiki')} className="text-blue-400 hover:text-blue-300 underline">bombcast.com/wiki</button> for updates and contribution opportunities.
                </p>
              </div>
              <div className="p-4 bg-blue-900/10 border border-blue-500/10 rounded-lg mt-4">
                <p className="text-xs text-blue-300">When the API becomes available again, Giant Bomb will provide high-quality game metadata and artwork as an additional source.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
