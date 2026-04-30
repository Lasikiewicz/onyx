import React from 'react';

interface OnyxLogoSpinnerProps {
    className?: string;
    size?: number;
}

const faces = [
    (depth: number) => `rotateY(0deg) translateZ(${depth}px)`,
    (depth: number) => `rotateY(90deg) translateZ(${depth}px)`,
    (depth: number) => `rotateX(90deg) translateZ(${depth}px)`,
    (depth: number) => `rotateY(180deg) translateZ(${depth}px)`,
    (depth: number) => `rotateY(-90deg) translateZ(${depth}px)`,
    (depth: number) => `rotateX(-90deg) translateZ(${depth}px)`,
];

export const OnyxLogoSpinner: React.FC<OnyxLogoSpinnerProps> = ({ className = '', size = 76 }) => {
    const depth = size / 2;
    const ringSize = size * 0.45;
    const ringBorder = Math.max(3, Math.round(size * 0.04));
    const layoutSize = size + 24;
    const glowSize = size * 2;

    return (
        <div
            className={`relative flex items-center justify-center [perspective:900px] ${className}`.trim()}
            style={{ width: `${layoutSize}px`, height: `${layoutSize}px` }}
            aria-hidden="true"
        >
            <div
                className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18)_0%,transparent_70%)] blur-2xl"
                style={{ width: `${glowSize}px`, height: `${glowSize}px` }}
            />

            <div className="onyx-logo-loader-cube absolute left-1/2 top-1/2">
                {faces.map((getTransform, index) => (
                    <div
                        key={index}
                        className="absolute flex items-center justify-center border border-cyan-400 bg-gradient-to-b from-slate-800 to-slate-950 shadow-[0_0_22px_rgba(56,189,248,0.14)] [backface-visibility:visible]"
                        style={{
                            width: `${size}px`,
                            height: `${size}px`,
                            marginLeft: `${-size / 2}px`,
                            marginTop: `${-size / 2}px`,
                            transform: getTransform(depth),
                        }}
                    >
                        <div
                            className="rounded-full border-white bg-transparent shadow-[0_0_16px_rgba(56,189,248,0.9),inset_0_0_10px_rgba(56,189,248,0.6)] [filter:drop-shadow(0_0_4px_rgba(56,189,248,1))]"
                            style={{
                                width: `${ringSize}px`,
                                height: `${ringSize}px`,
                                borderWidth: `${ringBorder}px`,
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
