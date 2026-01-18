import React, { ReactNode } from 'react';

interface SettingsLayoutProps {
    children: ReactNode;
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
    children,
    isOpen,
    onClose
}) => {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 pointer-events-none">
                <div
                    className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-7xl h-full max-h-[85vh] shadow-2xl flex overflow-hidden pointer-events-auto transform transition-all animate-modal-slide-up"
                    onClick={(e) => e.stopPropagation()}
                >
                    {children}
                </div>
            </div>
        </>
    );
};
