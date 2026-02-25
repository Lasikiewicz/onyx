import React from 'react';

interface ImportWorkbenchWelcomeProps {
    preferAnimatedBoxart: boolean;
    onTogglePreferAnimatedBoxart: () => void;
    preferAnimatedBanner: boolean;
    onTogglePreferAnimatedBanner: () => void;
    isScanning: boolean;
    onScanAll: () => void;
}

export const ImportWorkbenchWelcome: React.FC<ImportWorkbenchWelcomeProps> = ({
    preferAnimatedBoxart,
    onTogglePreferAnimatedBoxart,
    preferAnimatedBanner,
    onTogglePreferAnimatedBanner,
    isScanning,
    onScanAll
}) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-6 p-8">
            <div className="text-center max-w-md space-y-2">
                <h3 className="text-xl font-semibold text-white">Welcome to Game Importer</h3>
                <p className="text-gray-400">
                    Detect games installed on your system from Steam, Epic, GOG, and other launchers.
                </p>
            </div>

            <div className="flex flex-col gap-3 my-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-10 h-5 md:w-12 md:h-6 rounded-full relative transition-colors duration-300 ${preferAnimatedBoxart ? 'bg-blue-600' : 'bg-gray-700 group-hover:bg-gray-600'}`}>
                        <div className={`absolute top-1 left-1 bg-white w-3 h-3 md:w-4 md:h-4 rounded-full transition-transform duration-300 ${preferAnimatedBoxart ? 'translate-x-5 md:translate-x-6' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                        Prefer Animated Box Art
                    </span>
                    <input
                        type="checkbox"
                        className="hidden"
                        checked={preferAnimatedBoxart}
                        onChange={onTogglePreferAnimatedBoxart}
                    />
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-10 h-5 md:w-12 md:h-6 rounded-full relative transition-colors duration-300 ${preferAnimatedBanner ? 'bg-blue-600' : 'bg-gray-700 group-hover:bg-gray-600'}`}>
                        <div className={`absolute top-1 left-1 bg-white w-3 h-3 md:w-4 md:h-4 rounded-full transition-transform duration-300 ${preferAnimatedBanner ? 'translate-x-5 md:translate-x-6' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                        Prefer Animated Banners
                    </span>
                    <input
                        type="checkbox"
                        className="hidden"
                        checked={preferAnimatedBanner}
                        onChange={onTogglePreferAnimatedBanner}
                    />
                </label>
            </div>

            <button
                onClick={onScanAll}
                disabled={isScanning}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-xl text-lg font-medium shadow-lg hover:shadow-blue-500/20 transition-all flex items-center gap-3"
            >
                {isScanning ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        <span>Scanning System...</span>
                    </>
                ) : (
                    <>
                        <svg className="w-6 h-6 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>Scan For Games</span>
                    </>
                )}
            </button>

            <p className="text-xs text-gray-500 max-w-xs text-center">
                You can review matches and fix file info before final import.
            </p>
        </div>
    );
};
