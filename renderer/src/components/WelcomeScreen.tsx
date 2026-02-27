import React, { useState, useEffect } from 'react';
import { areAPIsConfigured } from '../utils/apiValidation';

type SetupStep = 'welcome' | 'steamgriddb' | 'otherFolders' | 'overview';

/** Nearly full-screen panel for API Keys and Other Folders steps (padding on all sides, content can scroll inside) */
const STEP_PANEL_API_KEYS_CLASS = 'w-full max-h-[calc(100vh-4rem)] bg-gray-900/60 border border-gray-700/50 rounded-3xl p-12 backdrop-blur-xl shadow-2xl text-left overflow-auto';
const STEP_WRAPPER_API_KEYS_CLASS = 'flex flex-col items-center justify-center min-h-full px-4 py-8 animate-in fade-in zoom-in duration-500';

interface WelcomeScreenProps {
    onScanGames: () => void;
    onAddFolder: (path: string, categories: string[]) => void;
    onOpenSettings: () => void;
}

const AUTO_CATEGORIES = ['Games', 'Apps', 'VR'] as const;

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onScanGames, onAddFolder, onOpenSettings }) => {
    const [apisConfigured, setApisConfigured] = useState<boolean | null>(null);

    // Setup flow when user clicks "Scan for Games"
    const [setupStep, setSetupStep] = useState<SetupStep>('welcome');
    const [steamGridDbKey, setSteamGridDbKey] = useState('');
    const [savingKey, setSavingKey] = useState(false);
    const [igdbClientId, setIgdbClientId] = useState('');
    const [igdbClientSecret, setIgdbClientSecret] = useState('');
    const [rawgApiKey, setRawgApiKey] = useState('');
    const [giantBombApiKey, setGiantBombApiKey] = useState('');
    const [addedFolders, setAddedFolders] = useState<{ path: string; categories: string[] }[]>([]);
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [overviewApis, setOverviewApis] = useState<{ steamGridDB: boolean; igdb: boolean; rawg: boolean; giantBomb: boolean } | null>(null);
    const [overviewKeyInputs, setOverviewKeyInputs] = useState<{ steamGridDB: string; igdbClientId: string; igdbClientSecret: string; rawg: string }>({ steamGridDB: '', igdbClientId: '', igdbClientSecret: '', rawg: '' });
    const [savingOverviewKey, setSavingOverviewKey] = useState<string | null>(null);

    // Animation preferences
    const [preferAnimatedBoxart, setPreferAnimatedBoxart] = useState(true);
    const [preferAnimatedBanner, setPreferAnimatedBanner] = useState(true);
    const [optimizationPerformance, setOptimizationPerformance] = useState<'low' | 'balanced' | 'high' | null>(null);

    useEffect(() => {
        const checkAPIs = async () => {
            const configured = await areAPIsConfigured();
            setApisConfigured(configured);
        };
        checkAPIs();

        const handleFocus = () => checkAPIs();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    useEffect(() => {
        if (setupStep === 'steamgriddb' && window.electronAPI.getAPICredentials) {
            window.electronAPI.getAPICredentials().then(creds => {
                if (creds.steamGridDBApiKey) setSteamGridDbKey(creds.steamGridDBApiKey);
                if (creds.igdbClientId) setIgdbClientId(creds.igdbClientId);
                if (creds.igdbClientSecret) setIgdbClientSecret(creds.igdbClientSecret);
                if (creds.rawgApiKey) setRawgApiKey(creds.rawgApiKey);
                if (creds.giantBombApiKey) setGiantBombApiKey(creds.giantBombApiKey);
            });
        }
    }, [setupStep]);

    useEffect(() => {
        if (setupStep === 'overview' && window.electronAPI.getAPICredentials) {
            setOverviewApis(null);
            window.electronAPI.getAPICredentials().then(creds => {
                setOverviewApis({
                    steamGridDB: !!(creds.steamGridDBApiKey?.trim()),
                    igdb: !!(creds.igdbClientId?.trim() && creds.igdbClientSecret?.trim()),
                    rawg: !!(creds.rawgApiKey?.trim()),
                    giantBomb: !!(creds.giantBombApiKey?.trim())
                });
            });
            window.electronAPI.getPreferences().then((prefs: any) => {
                setPreferAnimatedBoxart(prefs.preferAnimatedBoxart ?? true);
                setPreferAnimatedBanner(prefs.preferAnimatedBanner ?? true);
                setOptimizationPerformance(prefs.optimizationPerformance ?? null);
            });
        }
    }, [setupStep]);

    const handleApisContinue = async () => {
        setSavingKey(true);
        try {
            const creds = await window.electronAPI.getAPICredentials();
            await window.electronAPI.saveAPICredentials({
                ...creds,
                steamGridDBApiKey: steamGridDbKey.trim() || undefined,
                igdbClientId: igdbClientId.trim() || undefined,
                igdbClientSecret: igdbClientSecret.trim() || undefined,
                rawgApiKey: rawgApiKey.trim() || undefined,
                giantBombApiKey: giantBombApiKey.trim() || undefined
            });
            setSetupStep('otherFolders');
        } catch (err) {
            console.error('Error saving API credentials:', err);
        } finally {
            setSavingKey(false);
        }
    };

    const handleApisSkip = () => {
        setSetupStep('otherFolders');
    };

    const handleAddFolderToSetup = async () => {
        try {
            const path = await window.electronAPI.showFolderDialog();
            if (path && !addedFolders.some(f => f.path === path)) {
                setAddedFolders(prev => [...prev, { path, categories: ['Games'] }]);
            }
        } catch (err) {
            console.error('Error picking folder:', err);
        }
    };

    const removeAddedFolder = (path: string) => {
        setAddedFolders(prev => prev.filter(f => f.path !== path));
    };

    const handleOtherFoldersNext = () => {
        setSetupStep('overview');
    };

    const saveOverviewApiKey = async (api: 'steamGridDB' | 'igdb' | 'rawg') => {
        if (!window.electronAPI.getAPICredentials || !window.electronAPI.saveAPICredentials) return;
        setSavingOverviewKey(api);
        try {
            const creds = await window.electronAPI.getAPICredentials();
            if (api === 'steamGridDB') {
                await window.electronAPI.saveAPICredentials({ ...creds, steamGridDBApiKey: overviewKeyInputs.steamGridDB.trim() || undefined });
                setOverviewKeyInputs(prev => ({ ...prev, steamGridDB: '' }));
            } else if (api === 'igdb') {
                await window.electronAPI.saveAPICredentials({
                    ...creds,
                    igdbClientId: overviewKeyInputs.igdbClientId.trim() || undefined,
                    igdbClientSecret: overviewKeyInputs.igdbClientSecret.trim() || undefined
                });
                setOverviewKeyInputs(prev => ({ ...prev, igdbClientId: '', igdbClientSecret: '' }));
            } else if (api === 'rawg') {
                await window.electronAPI.saveAPICredentials({ ...creds, rawgApiKey: overviewKeyInputs.rawg.trim() || undefined });
                setOverviewKeyInputs(prev => ({ ...prev, rawg: '' }));
            }
            const next = await window.electronAPI.getAPICredentials();
            setOverviewApis({
                steamGridDB: !!(next.steamGridDBApiKey?.trim()),
                igdb: !!(next.igdbClientId?.trim() && next.igdbClientSecret?.trim()),
                rawg: !!(next.rawgApiKey?.trim()),
                giantBomb: !!(next.giantBombApiKey?.trim())
            });
        } catch (err) {
            console.error('Error saving API key:', err);
        } finally {
            setSavingOverviewKey(null);
        }
    };

    const handleOtherFoldersDone = async () => {
        if (!optimizationPerformance) {
            return;
        }

        // Save the animated preferences
        try {
            await window.electronAPI.savePreferences({
                preferAnimatedBoxart,
                preferAnimatedBanner,
                optimizationPerformance
            });
        } catch (err) {
            console.error('Error saving animated preferences:', err);
        }

        for (const { path, categories } of addedFolders) {
            await onAddFolder(path, categories);
        }
        setAddedFolders([]);
        setSetupStep('welcome');
        onScanGames();
    };

    const toggleFolderCategory = (path: string, cat: string) => {
        setAddedFolders(prev =>
            prev.map(f => {
                if (f.path !== path) return f;
                const next = f.categories.includes(cat)
                    ? f.categories.filter(c => c !== cat)
                    : [...f.categories, cat];
                return { ...f, categories: next };
            })
        );
    };

    const allCategories = [...AUTO_CATEGORIES, ...customCategories];
    const handleAddCustomCategory = () => {
        const name = newCategoryName.trim();
        if (!name) return;
        const exists = allCategories.some(c => c.toLowerCase() === name.toLowerCase());
        if (exists) return;
        setCustomCategories(prev => [...prev, name]);
        setNewCategoryName('');
    };

    // Step: SteamGridDB + IGDB (Twitch) + RAWG on one page
    if (setupStep === 'steamgriddb') {
        return (
            <div className={`${STEP_WRAPPER_API_KEYS_CLASS} overflow-auto`}>
                <div className={STEP_PANEL_API_KEYS_CLASS}>
                    {/* Title: key icon + API Keys */}
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center shrink-0">
                            <svg className="w-8 h-8 text-blue-400 animate-slow-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-white">API Keys</h2>
                    </div>
                    <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                        API keys let Onyx fetch richer data when you import games.
                        You can skip this and add keys later in Settings if you prefer but this is not recommended.
                    </p>

                    {/* SteamGridDB and IGDB beside each other; key row at bottom of each card */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-stretch">
                        {/* SteamGridDB (Highly Recommended) */}
                        <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl flex flex-col min-h-0">
                            <div className="flex items-center gap-2 mb-4 flex-wrap">
                                <h4 className="text-sm font-semibold text-white">SteamGridDB</h4>
                                <span className="px-2 py-0.5 text-sm font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Highly Recommended for high quality artwork</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0 content-start">
                                <div className="md:col-span-2 p-3 bg-blue-900/10 border border-blue-500/20 rounded-lg">
                                    <h4 className="text-sm font-semibold text-white mb-2">How to get a key</h4>
                                    <ol className="space-y-1 list-decimal list-inside text-gray-300 text-sm">
                                        <li>Open the <button type="button" onClick={() => window.electronAPI?.openExternal('https://www.steamgriddb.com/profile/preferences/api')} className="text-blue-400 hover:text-blue-300 underline">SteamGridDB API page</button></li>
                                        <li>Log in and click <span className="font-medium text-white">Generate API Key</span></li>
                                        <li>Copy the key and paste it below. You can also add it later in Settings → APIs.</li>
                                    </ol>
                                </div>
                                <div className="md:col-span-1">
                                    <p className="text-sm text-gray-400 mb-1 leading-relaxed">SteamGridDB is used for</p>
                                    <ul className="text-sm text-gray-400 list-disc list-inside space-y-0.5 leading-relaxed">
                                        <li>High-quality artwork</li>
                                        <li>Box art</li>
                                        <li>Logos</li>
                                        <li>Banners</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-4 mt-auto">
                                <label className="text-sm text-gray-400 shrink-0">API Key (optional)</label>
                                <input
                                    type="password"
                                    value={steamGridDbKey}
                                    onChange={e => setSteamGridDbKey(e.target.value)}
                                    placeholder="Paste your SteamGridDB API key here"
                                    className="flex-1 min-w-0 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* IGDB (Twitch) (Highly Recommended) */}
                        <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl flex flex-col min-h-0">
                            <div className="flex items-center gap-2 mb-4 flex-wrap">
                                <h4 className="text-sm font-semibold text-white">IGDB (Twitch)</h4>
                                <span className="px-2 py-0.5 text-sm font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Highly Recommended for the links icons to work</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0 content-start">
                                <div className="md:col-span-2 p-3 bg-blue-900/10 border border-blue-500/20 rounded-lg">
                                    <h4 className="text-sm font-semibold text-white mb-2">How to get a key</h4>
                                    <ol className="space-y-1 list-decimal list-inside text-gray-300 text-sm">
                                        <li>Open the <button type="button" onClick={() => window.electronAPI?.openExternal('https://dev.twitch.tv/console')} className="text-blue-400 hover:text-blue-300 underline">Twitch Developer Console</button></li>
                                        <li>Register your application (e.g. name it &quot;Onyx&quot;, category &quot;Game Integration&quot;, and set OAuth Redirect URL to <code className="bg-gray-700/50 px-1 py-0.5 rounded text-blue-300">http://localhost</code>)</li>
                                        <li>Copy <strong className="text-white">Client ID</strong> and create a <strong className="text-white">Client Secret</strong> under Manage. Paste both below.</li>
                                    </ol>
                                </div>
                                <div className="md:col-span-1">
                                    <p className="text-sm text-gray-400 mb-1 leading-relaxed">IGDB (Twitch) is used for</p>
                                    <ul className="text-sm text-gray-400 list-disc list-inside space-y-0.5 leading-relaxed">
                                        <li>Official game links</li>
                                        <li>Release dates</li>
                                        <li>Genres</li>
                                        <li>Descriptions</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-4 mt-auto">
                                <label className="text-sm text-gray-400 shrink-0">Client ID &amp; Client Secret</label>
                                <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
                                    <input type="text" value={igdbClientId} onChange={e => setIgdbClientId(e.target.value)} placeholder="IGDB Client ID" className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500 outline-none" />
                                    <input type="password" value={igdbClientSecret} onChange={e => setIgdbClientSecret(e.target.value)} placeholder="IGDB Client Secret" className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500 outline-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RAWG and GiantBomb — same layout as SteamGridDB/IGDB */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-stretch">
                        {/* RAWG (optional) */}
                        <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl flex flex-col min-h-0">
                            <div className="flex items-center gap-2 mb-4">
                                <h4 className="text-sm font-semibold text-white">RAWG (optional)</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0 content-start">
                                <div className="md:col-span-2 p-3 bg-blue-900/10 border border-blue-500/20 rounded-lg">
                                    <h4 className="text-sm font-semibold text-white mb-2">How to get a key</h4>
                                    <ol className="space-y-1 list-decimal list-inside text-gray-300 text-sm">
                                        <li>Sign up at <button type="button" onClick={() => window.electronAPI?.openExternal('https://rawg.io/apidocs')} className="text-blue-400 hover:text-blue-300 underline">RAWG API</button></li>
                                        <li>Get your API key from your profile and paste it below</li>
                                    </ol>
                                </div>
                                <div className="md:col-span-1">
                                    <p className="text-sm text-gray-400 mb-1 leading-relaxed">RAWG is used for</p>
                                    <ul className="text-sm text-gray-400 list-disc list-inside space-y-0.5 leading-relaxed">
                                        <li>Metadata</li>
                                        <li>Artwork</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-4 mt-auto">
                                <label className="text-sm text-gray-400 shrink-0">RAWG API Key</label>
                                <input type="password" value={rawgApiKey} onChange={e => setRawgApiKey(e.target.value)} placeholder="RAWG API Key" className="flex-1 min-w-0 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500 outline-none" />
                            </div>
                        </div>

                        {/* GiantBomb (optional) — API unavailable overlay on top */}
                        <div className="relative p-4 bg-gray-800/50 border border-gray-700 rounded-xl flex flex-col min-h-0">
                            {/* Overlay: covers the section */}
                            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-gray-900/85 p-4">
                                <div className="p-4 rounded-lg border border-red-500/40 bg-red-950/40 flex gap-3 max-w-md">
                                    <svg className="w-6 h-6 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-semibold text-red-400">API Currently Unavailable</p>
                                        <p className="text-sm text-gray-300 mt-1">
                                            Giant Bomb is rebuilding their API infrastructure after becoming independent from Fandom. The API is temporarily offline while they migrate their tech stack.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <h4 className="text-sm font-semibold text-white">GiantBomb (optional)</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0 content-start">
                                <div className="md:col-span-2 p-3 bg-blue-900/10 border border-blue-500/20 rounded-lg">
                                    <h4 className="text-sm font-semibold text-white mb-2">How to get a key</h4>
                                    <ol className="space-y-1 list-decimal list-inside text-gray-300 text-sm">
                                        <li>Visit the <button type="button" onClick={() => window.electronAPI?.openExternal('https://www.giantbomb.com/api/')} className="text-blue-400 hover:text-blue-300 underline">Giant Bomb API</button> page</li>
                                        <li>Log in and generate an API key, then paste it below</li>
                                    </ol>
                                </div>
                                <div className="md:col-span-1">
                                    <p className="text-sm text-gray-400 mb-1 leading-relaxed">GiantBomb is used for</p>
                                    <ul className="text-sm text-gray-400 list-disc list-inside space-y-0.5 leading-relaxed">
                                        <li>Metadata</li>
                                        <li>Artwork</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-4 mt-auto">
                                <label className="text-sm text-gray-400 shrink-0">GiantBomb API Key</label>
                                <input type="password" value={giantBombApiKey} onChange={e => setGiantBombApiKey(e.target.value)} placeholder="GiantBomb API Key (when available)" className="flex-1 min-w-0 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500 outline-none" />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setSetupStep('welcome')}
                            className="flex-1 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-2xl transition-all"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleApisSkip}
                            className="flex-1 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-2xl transition-all"
                        >
                            Skip
                        </button>
                        <button
                            onClick={handleApisContinue}
                            disabled={savingKey}
                            className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                        >
                            {savingKey ? 'Saving…' : 'Continue'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step: Other folders — same size and font sizes as API Keys step
    if (setupStep === 'otherFolders') {
        return (
            <div className={`${STEP_WRAPPER_API_KEYS_CLASS} overflow-auto`}>
                <div className={STEP_PANEL_API_KEYS_CLASS}>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center shrink-0">
                            <svg className="w-8 h-8 text-blue-400 animate-slow-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-white">Games in other folders?</h2>
                    </div>
                    <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                        When you run the scan, Onyx will automatically look for games in common locations, including Steam, Xbox, Epic, GOG, Ubisoft, and other launchers, so you don&apos;t have to add those manually.
                    </p>
                    <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                        If you keep games in custom folders (e.g. a separate drive or a non-standard path), add them below so we can monitor and import from them too.
                    </p>

                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Auto-assign categories</label>
                        <p className="text-sm text-gray-500 mb-3 leading-relaxed">
                            For each folder you add, choose one or more categories (e.g. <strong className="text-gray-400">Games</strong>, <strong className="text-gray-400">Apps</strong>, <strong className="text-gray-400">VR</strong>). Every game we find in that folder will be tagged with these categories so you can filter and organize your library. You can change this later in Settings.
                        </p>
                        {addedFolders.length === 0 ? (
                            <button
                                onClick={handleAddFolderToSetup}
                                className="w-full px-4 py-4 border border-dashed border-gray-600 hover:border-blue-500 rounded-xl text-gray-400 hover:text-blue-400 transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add folder
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {addedFolders.map(({ path, categories }) => (
                                        <div key={path} className="flex flex-col gap-2 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm text-gray-300 break-all" title={path}>{path}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAddedFolder(path)}
                                                    className="text-red-400 hover:text-red-300 text-sm font-medium shrink-0"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {allCategories.map(cat => {
                                                    const isSelected = categories.includes(cat);
                                                    return (
                                                        <button
                                                            key={cat}
                                                            type="button"
                                                            onClick={() => toggleFolderCategory(path, cat)}
                                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                                                        >
                                                            {isSelected ? '✓ ' : ''}{cat}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                <input
                                                    type="text"
                                                    value={newCategoryName}
                                                    onChange={e => setNewCategoryName(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleAddCustomCategory()}
                                                    placeholder="New category name"
                                                    className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500 outline-none w-40"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddCustomCategory}
                                                    disabled={!newCategoryName.trim()}
                                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all flex items-center gap-1.5"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                    Add category
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleAddFolderToSetup}
                                    className="w-full px-4 py-3 border border-dashed border-gray-600 hover:border-blue-500 rounded-xl text-gray-400 hover:text-blue-400 transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Add another folder
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setSetupStep('steamgriddb')} className="flex-1 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-2xl transition-all">Back</button>
                        <button onClick={handleOtherFoldersNext} className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-600/20">Next</button>
                    </div>
                </div>
            </div>
        );
    }

    // Step: Overview — checklist of selected options before starting scan
    if (setupStep === 'overview') {
        return (
            <div className={`${STEP_WRAPPER_API_KEYS_CLASS} overflow-auto`}>
                <div className={STEP_PANEL_API_KEYS_CLASS}>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center shrink-0">
                            <svg className="w-8 h-8 text-green-400 animate-slow-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-white">Overview</h2>
                    </div>
                    <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                        Here’s what will be used for your first scan. You can go back to change anything.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">APIs added</h3>
                            {overviewApis === null ? (
                                <p className="text-gray-500 text-sm">Loading…</p>
                            ) : (
                                <div className="grid grid-cols-4 gap-2.5">
                                    {[
                                        { key: 'steamGridDB' as const, label: 'SteamGridDB' },
                                        { key: 'igdb' as const, label: 'IGDB (Twitch)' },
                                        { key: 'rawg' as const, label: 'RAWG' },
                                        { key: 'giantBomb' as const, label: 'Giant Bomb' }
                                    ].map(({ key, label }) => {
                                        const isAdded = overviewApis[key];
                                        const isGiantBomb = key === 'giantBomb';
                                        const saving = savingOverviewKey === key || (key === 'igdb' && savingOverviewKey === 'igdb');
                                        const tile = (
                                            <div
                                                key={key}
                                                className={`relative flex flex-col gap-1.5 p-2.5 rounded-xl border min-h-0 ${isAdded ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-800/30 border-gray-700/70'}`}
                                            >
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {isAdded ? <span className="text-green-400 text-lg">✓</span> : <span className="text-gray-500 text-lg">○</span>}
                                                    <span className={`text-sm text-center font-medium ${isAdded ? 'text-gray-300' : 'text-gray-500'}`}>{label}</span>
                                                </div>
                                                {isAdded ? (
                                                    <p className="text-xs text-green-400/90 text-center">Good to go</p>
                                                ) : isGiantBomb ? (
                                                    <div className="mt-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSetupStep('steamgriddb')}
                                                            className="text-xs font-medium text-blue-400 hover:text-blue-300 underline"
                                                        >
                                                            Add key
                                                        </button>
                                                    </div>
                                                ) : key === 'steamGridDB' ? (
                                                    <div className="mt-1 flex items-end gap-1.5">
                                                        <input
                                                            type="password"
                                                            value={overviewKeyInputs.steamGridDB}
                                                            onChange={e => setOverviewKeyInputs(prev => ({ ...prev, steamGridDB: e.target.value }))}
                                                            placeholder="API key"
                                                            className="min-w-0 flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded-lg text-white text-xs placeholder-gray-500 focus:border-blue-500 outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={!overviewKeyInputs.steamGridDB.trim() || saving}
                                                            onClick={() => saveOverviewApiKey('steamGridDB')}
                                                            className="shrink-0 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-all"
                                                        >
                                                            {saving ? 'Saving…' : 'Save key'}
                                                        </button>
                                                    </div>
                                                ) : key === 'igdb' ? (
                                                    <div className="mt-1 grid grid-cols-[1fr_auto] items-end gap-1.5">
                                                        <div className="space-y-1.5">
                                                            <input
                                                                type="text"
                                                                value={overviewKeyInputs.igdbClientId}
                                                                onChange={e => setOverviewKeyInputs(prev => ({ ...prev, igdbClientId: e.target.value }))}
                                                                placeholder="Client ID"
                                                                className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded-lg text-white text-xs placeholder-gray-500 focus:border-blue-500 outline-none"
                                                            />
                                                            <input
                                                                type="password"
                                                                value={overviewKeyInputs.igdbClientSecret}
                                                                onChange={e => setOverviewKeyInputs(prev => ({ ...prev, igdbClientSecret: e.target.value }))}
                                                                placeholder="Client Secret"
                                                                className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded-lg text-white text-xs placeholder-gray-500 focus:border-blue-500 outline-none"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            disabled={!overviewKeyInputs.igdbClientId.trim() || !overviewKeyInputs.igdbClientSecret.trim() || saving}
                                                            onClick={() => saveOverviewApiKey('igdb')}
                                                            className="shrink-0 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-all"
                                                        >
                                                            {saving ? 'Saving…' : 'Save key'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="mt-1 flex items-end gap-1.5">
                                                        <input
                                                            type="password"
                                                            value={overviewKeyInputs.rawg}
                                                            onChange={e => setOverviewKeyInputs(prev => ({ ...prev, rawg: e.target.value }))}
                                                            placeholder="API key"
                                                            className="min-w-0 flex-1 px-2 py-1 bg-gray-800 border border-gray-600 rounded-lg text-white text-xs placeholder-gray-500 focus:border-blue-500 outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={!overviewKeyInputs.rawg.trim() || saving}
                                                            onClick={() => saveOverviewApiKey('rawg')}
                                                            className="shrink-0 px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-all"
                                                        >
                                                            {saving ? 'Saving…' : 'Save key'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                        if (isGiantBomb) {
                                            return (
                                                <div key={key} className="relative">
                                                    {tile}
                                                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-gray-900/90">
                                                        <span className="text-sm font-semibold text-red-400">Currently Unavailable</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return tile;
                                    })}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Custom folders</h3>
                            {addedFolders.length === 0 ? (
                                <p className="text-sm text-gray-500">No custom folders added.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                    {addedFolders.map(({ path, categories }) => (
                                        <div key={path} className="flex flex-col gap-1.5 p-2.5 bg-gray-800/50 border border-gray-700 rounded-xl">
                                            <p className="text-xs text-gray-300 break-all" title={path}>{path}</p>
                                            {categories.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {categories.map(cat => (
                                                        <span key={cat} className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-300 border border-blue-500/30">
                                                            {cat}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Animation Preferences</h3>
                            <p className="text-xs text-amber-400 mb-2 leading-relaxed">
                                Animated images can take longer to optimize. Optimization runs in the background and may continue for a while after your scan starts.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-blue-500/50 rounded-xl cursor-pointer transition-colors group select-none">
                                    <div className="relative flex items-center shrink-0">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={preferAnimatedBoxart}
                                            onChange={(e) => setPreferAnimatedBoxart(e.target.checked)}
                                        />
                                        <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${preferAnimatedBoxart ? 'bg-blue-600' : 'bg-gray-700 group-hover:bg-gray-600'}`}>
                                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${preferAnimatedBoxart ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-sm font-medium text-gray-200">Prefer Animated Box Art</span>
                                        <span className="block text-xs text-gray-500 mt-0.5">Prioritize GIFs and WebPs for vertical covers (if available)</span>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-blue-500/50 rounded-xl cursor-pointer transition-colors group select-none">
                                    <div className="relative flex items-center shrink-0">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={preferAnimatedBanner}
                                            onChange={(e) => setPreferAnimatedBanner(e.target.checked)}
                                        />
                                        <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${preferAnimatedBanner ? 'bg-blue-600' : 'bg-gray-700 group-hover:bg-gray-600'}`}>
                                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${preferAnimatedBanner ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-sm font-medium text-gray-200">Prefer Animated Banners</span>
                                        <span className="block text-xs text-gray-500 mt-0.5">Prioritize GIFs and WebPs for horizontal heroes (if available)</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Optimization Performance (Required)</h3>
                            <p className="text-sm text-gray-500 mb-2 leading-relaxed">
                                Choose how aggressive image optimization should be. Lower settings reduce CPU load and keep your PC more responsive while scanning.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    {
                                        value: 'low' as const,
                                        label: 'Low CPU Usage',
                                        desc: 'Best responsiveness, slowest optimization'
                                    },
                                    {
                                        value: 'balanced' as const,
                                        label: 'Balanced',
                                        desc: 'Recommended for most PCs'
                                    },
                                    {
                                        value: 'high' as const,
                                        label: 'High Performance',
                                        desc: 'Fastest optimization, higher CPU usage'
                                    }
                                ].map((option) => {
                                    const selected = optimizationPerformance === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setOptimizationPerformance(option.value)}
                                            className={`text-left p-3 rounded-xl border transition-all ${selected
                                                ? 'bg-blue-600/20 border-blue-500/60 text-white'
                                                : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-blue-500/40'
                                                }`}
                                        >
                                            <p className="text-sm font-semibold">{option.label}</p>
                                            <p className="text-xs text-gray-400 mt-1">{option.desc}</p>
                                        </button>
                                    );
                                })}
                            </div>
                            {!optimizationPerformance && (
                                <p className="mt-3 text-sm text-amber-400">Select an optimization performance preference to continue.</p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-800/50 border border-gray-700 rounded-2xl">
                        <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-green-400 animate-slow-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-semibold text-white">Ready to scan</h3>
                                <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                                    Start scan searches all configured locations, fetches metadata and artwork from your APIs, and builds your library. It then starts optimizing images (including animated images) in the background, which can take a while.
                                    <span className="block mt-1">It may take a few minutes or longer depending on how many games you have.</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-3 border-t border-gray-700">
                            <button onClick={() => setSetupStep('otherFolders')} className="flex-1 px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all">Back</button>
                            <button
                                onClick={handleOtherFoldersDone}
                                disabled={!optimizationPerformance}
                                className="flex-1 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                            >
                                Start scan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 py-12 text-center animate-in fade-in zoom-in duration-700">
            <div className="max-w-3xl w-full">
                {/* Welcome Header */}
                <div className="mb-12">
                    <h1 className="text-5xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                        Welcome to Onyx
                    </h1>
                    <p className="text-xl text-gray-400">
                        Your premium, all-in-one gaming library. Let's get your collection organized.
                    </p>
                </div>

                {/* Action: Get started (or Configure APIs if required) */}
                <div className="mb-12">
                    {apisConfigured === false ? (
                        <button
                            onClick={onOpenSettings}
                            className="w-full max-w-2xl mx-auto group relative flex flex-col items-center p-8 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 hover:border-red-500/50 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-500/10"
                        >
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg className="w-8 h-8 text-red-400 group- hover:animate-gear-spin group-hover:animate-gear-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-2">Configure APIs</h3>
                            <p className="text-gray-400 text-sm mb-2">IGDB credentials are required for fetching game links and metadata.</p>
                            <span className="text-xs px-2 py-1 bg-red-900/50 text-red-300 rounded border border-red-800">Setup Required</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setSetupStep('steamgriddb')}
                            className="w-full max-w-2xl mx-auto group relative flex flex-col items-center p-8 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-500/50 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10"
                        >
                            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg className="w-8 h-8 text-blue-400 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-2">Click here to get started</h3>
                            <p className="text-gray-400 text-sm">We&apos;ll guide you through adding your SteamGridDB key, optional APIs, and any extra game folders, then scan for games.</p>
                        </button>
                    )}
                </div>

                {/* Quick Tips & Advice */}
                <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-8 text-left">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <svg className="w-4 h-4 group- hover:animate-gear-spin group-hover:animate-gear-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Quick Tips & Advice
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <p className="text-white font-medium text-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                Right-Click Everything
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Most features, like changing box art, modifying metadata, or pinning games, are available via the right-click menu.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-white font-medium text-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                                Middle-Click to Launch
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Instantly launch any game without opening the details panel by clicking your middle mouse button (scroll wheel).
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-white font-medium text-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                Update Library
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Use Update Library to rescan launchers and folders for new or changed games whenever your collection grows.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-white font-medium text-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                Categories & Favorites
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Use the category bar to filter by Games, Apps, VR, or Favorites. Pin categories for quick access.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-white font-medium text-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                                Hide & Organize
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Right-click a game to hide it from the main library. Hidden games stay in a separate list so nothing is lost.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-white font-medium text-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                                Fix Match
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                If artwork or metadata is wrong, right-click and choose Fix Match to search and pick the correct game.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-white font-medium text-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                View Modes
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Switch between Grid, List, Logo, and Carousel views from the view selector to suit how you browse.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-white font-medium text-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>
                                Settings & APIs
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Add or change API keys, monitored folders, and launcher paths anytime in Settings.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-white font-medium text-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                                Customize the UI
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Right-click on empty library space and open Appearance to customize layout, panel size, and more.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
