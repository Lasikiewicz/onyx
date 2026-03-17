import { LauncherIcon } from '../../utils/launcherIcons';
import manualFolderIconBaseline from '../../assets/manual-folder-icons/baseline-games.svg';
import manualFolderIconVariant1 from '../../assets/manual-folder-icons/games-variant-1.svg';
import manualFolderIconVariant2 from '../../assets/manual-folder-icons/games-variant-2.svg';
import manualFolderIconVariant3 from '../../assets/manual-folder-icons/games-variant-3.svg';
import manualFolderIconApps16Filled from '../../assets/manual-folder-icons/apps-16-filled.svg';
import manualFolderIconAppsFilled from '../../assets/manual-folder-icons/apps-filled.svg';
import manualFolderIconAppsOutline from '../../assets/manual-folder-icons/apps-outline.svg';
import manualFolderIconBadgeVrFill from '../../assets/manual-folder-icons/badge-vr-fill.svg';
import manualFolderIconBadgeVrOutline from '../../assets/manual-folder-icons/badge-vr-outline.svg';
import manualFolderIconVrCompact from '../../assets/manual-folder-icons/vr-compact.svg';
import manualFolderIconVrBadge from '../../assets/manual-folder-icons/vr-badge.svg';
import manualFolderIconVrGogglesFilled from '../../assets/manual-folder-icons/vr-goggles-filled.svg';
import manualFolderIconVrGogglesOutline from '../../assets/manual-folder-icons/vr-goggles-outline.svg';
import manualFolderIconVrSquare from '../../assets/manual-folder-icons/vr-square.svg';

export interface SettingsLibraryAppConfig {
  id: string;
  name: string;
  enabled: boolean;
  path: string;
  autoCategory?: string[];
}

export interface SettingsLibraryManualFolderConfig {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  autoCategory?: string[];
  icon?: string;
}

interface ManualFolderIconPreset {
  id: string;
  name: string;
  src: string;
}

const MANUAL_FOLDER_ICON_PRESETS: ManualFolderIconPreset[] = [
  { id: 'baseline-games', name: 'Baseline Games', src: manualFolderIconBaseline },
  { id: 'games-variant-1', name: 'Games 1', src: manualFolderIconVariant1 },
  { id: 'games-variant-2', name: 'Games 2', src: manualFolderIconVariant2 },
  { id: 'games-variant-3', name: 'Games 3', src: manualFolderIconVariant3 },
  { id: 'apps-16-filled', name: 'Apps 16 Filled', src: manualFolderIconApps16Filled },
  { id: 'apps-filled', name: 'Apps Filled', src: manualFolderIconAppsFilled },
  { id: 'apps-outline', name: 'Apps Outline', src: manualFolderIconAppsOutline },
  { id: 'badge-vr-fill', name: 'Badge VR Filled', src: manualFolderIconBadgeVrFill },
  { id: 'badge-vr-outline', name: 'Badge VR Outline', src: manualFolderIconBadgeVrOutline },
  { id: 'vr-compact', name: 'VR Compact', src: manualFolderIconVrCompact },
  { id: 'vr-badge', name: 'VR Badge', src: manualFolderIconVrBadge },
  { id: 'vr-goggles-filled', name: 'VR Goggles Filled', src: manualFolderIconVrGogglesFilled },
  { id: 'vr-goggles-outline', name: 'VR Goggles Outline', src: manualFolderIconVrGogglesOutline },
  { id: 'vr-square', name: 'VR Square', src: manualFolderIconVrSquare },
];

const getManualFolderIconPreset = (iconId?: string): ManualFolderIconPreset | undefined =>
  MANUAL_FOLDER_ICON_PRESETS.find((preset) => preset.id === iconId);

interface SettingsLibrariesTabProps {
  apps: SettingsLibraryAppConfig[];
  editingAppId: string | null;
  editingManualFolderId: string | null;
  isLoadingApps: boolean;
  manualFolderConfigs: Record<string, SettingsLibraryManualFolderConfig>;
  notifyManualFolderIconsUpdated: () => void;
  onAddManualFolder: () => Promise<void>;
  onBrowseApp: (appId: string) => Promise<void>;
  onOpenExternal: (url: string) => void;
  onRemoveManualFolder: (folderPath: string) => Promise<void>;
  onScanApp: (appId: string) => Promise<void>;
  onSetEditingAppId: (appId: string | null) => void;
  onSetEditingManualFolderId: (folderId: string | null) => void;
  onSetManualFolderConfigs: (configs: Record<string, SettingsLibraryManualFolderConfig>) => void;
  onToggleAppEnabled: (appId: string) => void;
  onUpdateAppCategory: (appId: string, categories: string[]) => void;
  onUpdateManualFolderName: (folderId: string, newName: string) => Promise<void>;
  scanningAppId: string | null;
}

export function SettingsLibrariesTab({
  apps,
  editingAppId,
  editingManualFolderId,
  isLoadingApps,
  manualFolderConfigs,
  notifyManualFolderIconsUpdated,
  onAddManualFolder,
  onBrowseApp,
  onOpenExternal,
  onRemoveManualFolder,
  onScanApp,
  onSetEditingAppId,
  onSetEditingManualFolderId,
  onSetManualFolderConfigs,
  onToggleAppEnabled,
  onUpdateAppCategory,
  onUpdateManualFolderName,
  scanningAppId,
}: SettingsLibrariesTabProps) {
  return (
    <div className="space-y-8 animate-fade-in h-full overflow-y-auto p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-700/50 pb-2">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Manual Folders</h3>
            <p className="text-gray-400 text-xs mt-0.5">Add custom directories to scan for games</p>
          </div>
          <button
            onClick={() => void onAddManualFolder()}
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
          >
            <svg className="w-3.5 h-3.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Folder
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
          <span>Need more icon options?</span>
          <button
            onClick={() => onOpenExternal('https://allsvgicons.com')}
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            allsvgicons.com
          </button>
          <span>Open an icon page, right-click the icon, then use Save As and keep the .svg format.</span>
        </div>

        {Object.keys(manualFolderConfigs).length === 0 ? (
          <div className="text-center py-6 bg-gray-800/30 rounded-lg border border-gray-700/50 border-dashed hover:bg-gray-800/50 transition-colors">
            <p className="text-gray-500 text-xs">No custom folders added yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-[2rem_minmax(120px,1fr)_minmax(180px,2fr)_minmax(140px,1.2fr)_auto_auto] gap-3 px-1 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              <span>Icon</span>
              <span>Name</span>
              <span>Path</span>
              <span>Category</span>
              <span></span>
              <span></span>
            </div>
            {Object.values(manualFolderConfigs).map((folderConfig) => (
              <div key={folderConfig.id} className="border border-gray-700/50 rounded-lg p-3 bg-gray-800/40 hover:bg-gray-800/60 transition-colors">
                <div className="grid grid-cols-[2rem_minmax(120px,1fr)_minmax(180px,2fr)_minmax(140px,1.2fr)_auto_auto] gap-3 items-center">
                  <div className="w-8 h-8 rounded border border-gray-600/60 bg-gray-900/60 flex items-center justify-center">
                    {getManualFolderIconPreset(folderConfig.icon) ? (
                      <img
                        src={getManualFolderIconPreset(folderConfig.icon)?.src}
                        alt={`${folderConfig.name} icon`}
                        className="w-4 h-4 brightness-0 invert opacity-90"
                      />
                    ) : (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                      </svg>
                    )}
                  </div>

                  <input
                    type="text"
                    value={folderConfig.name}
                    onChange={(e) => void onUpdateManualFolderName(folderConfig.id, e.target.value)}
                    onBlur={() => {
                      const config = manualFolderConfigs[folderConfig.id];
                      if (config && window.electronAPI.saveManualFolderConfig) {
                        void window.electronAPI.saveManualFolderConfig(config);
                        notifyManualFolderIconsUpdated();
                      }
                    }}
                    className="font-medium text-white text-sm bg-transparent border-none p-0 focus:ring-0 focus:underline min-w-0"
                  />

                  <div className="text-xs text-gray-300 font-mono truncate" title={folderConfig.path}>
                    {folderConfig.path}
                  </div>

                  <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                    {folderConfig.autoCategory && folderConfig.autoCategory.length > 0 ? (
                      <>
                        {folderConfig.autoCategory.slice(0, 3).map((cat) => (
                          <span key={cat} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-700 text-gray-300 border border-gray-600/50 whitespace-nowrap">
                            {cat}
                          </span>
                        ))}
                        {folderConfig.autoCategory.length > 3 && (
                          <span className="text-[10px] text-gray-500">+{folderConfig.autoCategory.length - 3}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-500">None</span>
                    )}
                  </div>

                  {folderConfig.enabled ? (
                    <button
                      onClick={() => onSetEditingManualFolderId(editingManualFolderId === folderConfig.id ? null : folderConfig.id)}
                      className={`text-xs font-medium px-2 py-1 rounded transition-colors ${editingManualFolderId === folderConfig.id ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                    >
                      Edit
                    </button>
                  ) : (
                    <span />
                  )}

                  <button
                    onClick={async () => {
                      const updated = { ...folderConfig, enabled: !folderConfig.enabled };
                      if (window.electronAPI.saveManualFolderConfig) {
                        await window.electronAPI.saveManualFolderConfig(updated);
                        onSetManualFolderConfigs({ ...manualFolderConfigs, [folderConfig.id]: updated });
                      }
                    }}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${folderConfig.enabled ? 'bg-blue-600' : 'bg-gray-600'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${folderConfig.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                  </button>
                </div>

                {editingManualFolderId === folderConfig.id && folderConfig.enabled && (
                  <div className="space-y-3 mt-3 pt-3 border-t border-gray-700/50 animate-fade-in origin-top">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Path</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={folderConfig.path}
                          readOnly
                          className="w-full px-2.5 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-gray-300 font-mono"
                        />
                        <button
                          onClick={() => void onRemoveManualFolder(folderConfig.path)}
                          className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded border border-red-500/20 transition-colors whitespace-nowrap"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Icon (SVG)</label>
                      <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
                        <button
                          onClick={async () => {
                            const updatedConfig = { ...folderConfig, icon: undefined };
                            onSetManualFolderConfigs({ ...manualFolderConfigs, [folderConfig.id]: updatedConfig });
                            if (window.electronAPI.saveManualFolderConfig) {
                              await window.electronAPI.saveManualFolderConfig(updatedConfig);
                              notifyManualFolderIconsUpdated();
                            }
                          }}
                          className={`h-9 rounded border text-[10px] transition-colors ${!folderConfig.icon ? 'border-blue-500/60 text-blue-300 bg-blue-500/10' : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}
                        >
                          None
                        </button>
                        {MANUAL_FOLDER_ICON_PRESETS.map((preset) => {
                          const isSelected = folderConfig.icon === preset.id;
                          return (
                            <button
                              key={preset.id}
                              onClick={async () => {
                                const updatedConfig = { ...folderConfig, icon: preset.id };
                                onSetManualFolderConfigs({ ...manualFolderConfigs, [folderConfig.id]: updatedConfig });
                                if (window.electronAPI.saveManualFolderConfig) {
                                  await window.electronAPI.saveManualFolderConfig(updatedConfig);
                                  notifyManualFolderIconsUpdated();
                                }
                              }}
                              className={`h-9 rounded border flex items-center justify-center transition-colors ${isSelected ? 'border-blue-500/60 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500 bg-gray-900/40'}`}
                              title={preset.name}
                            >
                              <img src={preset.src} alt={preset.name} className="w-4 h-4 brightness-0 invert opacity-90" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Auto Categories</label>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {(['Games', 'Apps', 'VR'] as const).map((cat) => {
                            const isSelected = folderConfig.autoCategory?.includes(cat);
                            return (
                              <button
                                key={cat}
                                onClick={async () => {
                                  const current = folderConfig.autoCategory || [];
                                  const updated = isSelected ? current.filter((c) => c !== cat) : [...current, cat];
                                  const updatedConfig = { ...folderConfig, autoCategory: updated };
                                  onSetManualFolderConfigs({ ...manualFolderConfigs, [folderConfig.id]: updatedConfig });
                                  if (window.electronAPI.saveManualFolderConfig) {
                                    await window.electronAPI.saveManualFolderConfig(updatedConfig);
                                  }
                                }}
                                className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${isSelected ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'}`}
                              >
                                {cat}
                              </button>
                            );
                          })}
                        </div>
                        <input
                          type="text"
                          placeholder="Custom categories (comma separated)"
                          value={folderConfig.autoCategory?.join(', ') || ''}
                          onChange={(e) => {
                            const categories = e.target.value.split(',').map((c) => c.trim()).filter((c) => c);
                            const updated = { ...folderConfig, autoCategory: categories };
                            onSetManualFolderConfigs({ ...manualFolderConfigs, [folderConfig.id]: updated });
                          }}
                          onBlur={async () => {
                            const config = manualFolderConfigs[folderConfig.id];
                            if (config && window.electronAPI.saveManualFolderConfig) {
                              await window.electronAPI.saveManualFolderConfig(config);
                            }
                          }}
                          className="w-full bg-gray-900/50 border border-gray-600/50 rounded px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="border-b border-gray-700/50 pb-2">
          <h3 className="text-base font-bold text-white tracking-tight">Launchers</h3>
          <p className="text-gray-400 text-xs mt-0.5">Configure platform integrations</p>
        </div>

        {isLoadingApps ? (
          <div className="flex items-center justify-center p-8">
            <svg className="animate-spin h-6 w-6 text-blue-500 group- hover:animate-wobble group-hover:animate-wobble" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {apps.map((app) => (
              <div key={app.id} className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 hover:bg-gray-800/60 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <LauncherIcon launcher={app.id} className="w-5 h-5" />
                    <span className={`font-medium text-sm ${app.enabled ? 'text-white' : 'text-gray-500'}`}>{app.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {app.enabled && (
                      <button
                        onClick={() => onSetEditingAppId(editingAppId === app.id ? null : app.id)}
                        className={`text-xs font-medium px-2 py-1 rounded transition-colors ${editingAppId === app.id ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => onToggleAppEnabled(app.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${app.enabled ? 'bg-blue-600' : 'bg-gray-600'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${app.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                    </button>
                  </div>
                </div>

                {editingAppId === app.id && app.enabled && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-4 animate-slide-down origin-top">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Installation Path</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={app.path || ''}
                          readOnly
                          className="flex-1 px-2.5 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-gray-300 font-mono"
                          placeholder="Not configured"
                        />
                        <button
                          onClick={() => void onBrowseApp(app.id)}
                          className="px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-xs font-medium rounded border border-blue-600/20 transition-colors whitespace-nowrap"
                        >
                          Change
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Auto Categories</label>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="e.g. FPS, RPG (comma separated)"
                          value={app.autoCategory?.join(', ') || ''}
                          onChange={(e) => onUpdateAppCategory(app.id, e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                          className="w-full bg-gray-900/50 border border-gray-600/50 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {['Favorite', 'Multiplayer', 'Completed'].map((cat) => (
                            <button
                              key={cat}
                              onClick={() => {
                                const current = app.autoCategory || [];
                                const updated = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
                                onUpdateAppCategory(app.id, updated);
                              }}
                              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${app.autoCategory?.includes(cat) ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'}`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => void onScanApp(app.id)}
                        disabled={scanningAppId === app.id}
                        className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white text-xs rounded border border-gray-600/50 flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {scanningAppId === app.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Scanning...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Force Scan</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
