import React, { useState, useEffect } from 'react';
import { areAPIsConfigured } from '../utils/apiValidation';

type SetupStep = 'welcome' | 'steamgriddb' | 'otherAPIs' | 'otherFolders';

/** Consistent size for all setup step panels (bigger popup, same across flow) */
const STEP_PANEL_CLASS = 'max-w-3xl w-full bg-gray-900/60 border border-gray-700/50 rounded-3xl p-12 backdrop-blur-xl shadow-2xl text-left';
const STEP_WRAPPER_CLASS = 'flex flex-col items-center justify-center min-h-full px-6 py-12 animate-in fade-in zoom-in duration-500';

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
    const [savingOtherApis, setSavingOtherApis] = useState(false);
    const [addedFolders, setAddedFolders] = useState<{ path: string; categories: string[] }[]>([]);
    const [customCategories, setCustomCategories] = useState<string[]>([]);
    const [newCategoryName, setNewCategoryName] = useState('');

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
        if ((setupStep === 'steamgriddb' || setupStep === 'otherAPIs') && window.electronAPI.getAPICredentials) {
            window.electronAPI.getAPICredentials().then(creds => {
                if (setupStep === 'steamgriddb' && creds.steamGridDBApiKey) setSteamGridDbKey(creds.steamGridDBApiKey);
                if (setupStep === 'otherAPIs') {
                    if (creds.igdbClientId) setIgdbClientId(creds.igdbClientId);
                    if (creds.igdbClientSecret) setIgdbClientSecret(creds.igdbClientSecret);
                    if (creds.rawgApiKey) setRawgApiKey(creds.rawgApiKey);
                }
            });
        }
    }, [setupStep]);

    const handleSteamGridDbContinue = async () => {
        setSavingKey(true);
        try {
            const creds = await window.electronAPI.getAPICredentials();
            await window.electronAPI.saveAPICredentials({
                ...creds,
                steamGridDBApiKey: steamGridDbKey.trim() || undefined
            });
            setSetupStep('otherAPIs');
        } catch (err) {
            console.error('Error saving SteamGridDB key:', err);
        } finally {
            setSavingKey(false);
        }
    };

    const handleSteamGridDbSkip = () => {
        setSetupStep('otherAPIs');
    };

    const handleOtherApisContinue = async () => {
        setSavingOtherApis(true);
        try {
            const creds = await window.electronAPI.getAPICredentials();
            await window.electronAPI.saveAPICredentials({
                ...creds,
                igdbClientId: igdbClientId.trim() || undefined,
                igdbClientSecret: igdbClientSecret.trim() || undefined,
                rawgApiKey: rawgApiKey.trim() || undefined
            });
            setSetupStep('otherFolders');
        } catch (err) {
            console.error('Error saving API credentials:', err);
        } finally {
            setSavingOtherApis(false);
        }
    };

    const handleOtherApisSkip = () => {
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

    const handleOtherFoldersDone = async () => {
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

    // Step: SteamGridDB API key
    if (setupStep === 'steamgriddb') {
        return (
            <div className={STEP_WRAPPER_CLASS}>
                <div className={STEP_PANEL_CLASS}>
                    <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-8">
                        <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">SteamGridDB API Key</h2>
                    <p className="text-gray-400 mb-6">
                        Onyx uses SteamGridDB to fetch high-quality box art, logos, and banners when importing games. Without a key we can still find and import games from Steam, Xbox, Epic, and other launchers, but artwork may be limited.
                    </p>
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">API Key (optional)</label>
                        <input
                            type="password"
                            value={steamGridDbKey}
                            onChange={e => setSteamGridDbKey(e.target.value)}
                            placeholder="Paste your SteamGridDB API key here"
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl mb-8">
                        <h4 className="text-sm font-semibold text-white mb-2">How to get a key</h4>
                        <ol className="space-y-1 list-decimal list-inside text-gray-300 text-sm">
                            <li>Open the <button type="button" onClick={() => window.electronAPI?.openExternal('https://www.steamgriddb.com/profile/preferences/api')} className="text-blue-400 hover:text-blue-300 underline">SteamGridDB API page</button></li>
                            <li>Log in and click <span className="font-medium text-white">Generate API Key</span></li>
                            <li>Copy the key and paste it above. You can also add it later in Settings → APIs.</li>
                        </ol>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setSetupStep('welcome')}
                            className="flex-1 px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-2xl transition-all"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleSteamGridDbSkip}
                            className="flex-1 px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-2xl transition-all"
                        >
                            Skip
                        </button>
                        <button
                            onClick={handleSteamGridDbContinue}
                            disabled={savingKey}
                            className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                        >
                            {savingKey ? 'Saving…' : 'Continue'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step: Other API keys (optional)
    if (setupStep === 'otherAPIs') {
        return (
            <div className={`${STEP_WRAPPER_CLASS} overflow-auto`}>
                <div className={STEP_PANEL_CLASS}>
                    <div className="w-20 h-20 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-8">
                        <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Other API Keys (optional)</h2>
                    <p className="text-gray-400 mb-6">
                        Adding more API keys improves game metadata and artwork. You can skip this and add them later in Settings if you prefer.
                    </p>

                    <div className="space-y-6 mb-8">
                        <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                            <h4 className="text-sm font-semibold text-white mb-2">IGDB (Twitch)</h4>
                            <p className="text-xs text-gray-400 mb-3">Provides release dates, genres, and descriptions. Helps match and identify games.</p>
                            <ol className="text-xs text-gray-300 list-decimal list-inside space-y-1 mb-3">
                                <li>Open the <button type="button" onClick={() => window.electronAPI?.openExternal('https://dev.twitch.tv/console')} className="text-blue-400 hover:text-blue-300 underline">Twitch Developer Console</button></li>
                                <li>Register your application (e.g. name it &quot;Onyx&quot;, category &quot;Game Integration&quot;)</li>
                                <li>Copy <strong className="text-white">Client ID</strong> and create a <strong className="text-white">Client Secret</strong> under Manage</li>
                            </ol>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input type="text" value={igdbClientId} onChange={e => setIgdbClientId(e.target.value)} placeholder="IGDB Client ID" className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500 outline-none" />
                                <input type="password" value={igdbClientSecret} onChange={e => setIgdbClientSecret(e.target.value)} placeholder="IGDB Client Secret" className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500 outline-none" />
                            </div>
                        </div>
                        <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                            <h4 className="text-sm font-semibold text-white mb-2">RAWG</h4>
                            <p className="text-xs text-gray-400 mb-3">Optional extra source for metadata and artwork.</p>
                            <ol className="text-xs text-gray-300 list-decimal list-inside space-y-1 mb-3">
                                <li>Sign up at <button type="button" onClick={() => window.electronAPI?.openExternal('https://rawg.io/apidocs')} className="text-blue-400 hover:text-blue-300 underline">RAWG API</button></li>
                                <li>Get your API key from your profile and paste it below</li>
                            </ol>
                            <input type="password" value={rawgApiKey} onChange={e => setRawgApiKey(e.target.value)} placeholder="RAWG API Key" className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:border-blue-500 outline-none" />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setSetupStep('steamgriddb')} className="flex-1 px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-2xl transition-all">Back</button>
                        <button onClick={handleOtherApisSkip} className="flex-1 px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-2xl transition-all">Skip</button>
                        <button onClick={handleOtherApisContinue} disabled={savingOtherApis} className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">{savingOtherApis ? 'Saving…' : 'Continue'}</button>
                    </div>
                </div>
            </div>
        );
    }

    // Step: Other folders
    if (setupStep === 'otherFolders') {
        return (
            <div className={`${STEP_WRAPPER_CLASS} overflow-auto`}>
                <div className={STEP_PANEL_CLASS}>
                    <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-8">
                        <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Games in other folders?</h2>
                    <p className="text-gray-400 mb-4">
                        When you run the scan, Onyx will automatically look for games in common locations, including Steam, Xbox, Epic, GOG, Ubisoft, and other launchers, so you don&apos;t have to add those manually.
                    </p>
                    <p className="text-gray-400 mb-6">
                        If you keep games in custom folders (e.g. a separate drive or a non-standard path), add them below so we can monitor and import from them too.
                    </p>

                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Auto-assign categories</label>
                        <p className="text-xs text-gray-500 mb-3">
                            For each folder you add, choose one or more categories (e.g. <strong className="text-gray-400">Games</strong>, <strong className="text-gray-400">Apps</strong>, <strong className="text-gray-400">VR</strong>). Every game we find in that folder will be tagged with these categories so you can filter and organize your library. You can change this later in Settings.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mb-4">
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
                        {addedFolders.length === 0 ? (
                            <button
                                onClick={handleAddFolderToSetup}
                                className="w-full px-4 py-4 border border-dashed border-gray-600 hover:border-blue-500 rounded-xl text-gray-400 hover:text-blue-400 transition-all flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add folder
                            </button>
                        ) : (
                            <div className="space-y-3">
                                {addedFolders.map(({ path, categories }) => (
                                    <div key={path} className="flex flex-col gap-2 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm text-gray-300 truncate" title={path}>{path.split(/[/\\]/).pop() || path}</span>
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
                                    </div>
                                ))}
                                <button
                                    onClick={handleAddFolderToSetup}
                                    className="w-full px-4 py-3 border border-dashed border-gray-600 hover:border-blue-500 rounded-xl text-gray-400 hover:text-blue-400 transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Add another folder
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setSetupStep('otherAPIs')} className="flex-1 px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-2xl transition-all">Back</button>
                        <button onClick={handleOtherFoldersDone} className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-600/20">Done, start scan</button>
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
                                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-2">Configure APIs</h3>
                            <p className="text-gray-400 text-sm mb-2">IGDB credentials are required to continue.</p>
                            <span className="text-xs px-2 py-1 bg-red-900/50 text-red-300 rounded border border-red-800">Setup Required</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setSetupStep('steamgriddb')}
                            className="w-full max-w-2xl mx-auto group relative flex flex-col items-center p-8 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-500/50 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10"
                        >
                            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
