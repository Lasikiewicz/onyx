import { useEffect, useRef } from 'react';

interface InteractiveOnyxLogoProps {
    className?: string;
}

const CUBE_SIZE = 220;
const CUBE_DEPTH = CUBE_SIZE / 2;

const faceBaseClassName = 'absolute flex items-center justify-center border-2 border-cyan-400 bg-gradient-to-b from-slate-800 to-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.1)] [backface-visibility:visible]';
const ringClassName = 'h-[45%] w-[45%] rounded-full border-[8px] border-white bg-transparent shadow-[0_0_25px_rgba(56,189,248,0.9),inset_0_0_15px_rgba(56,189,248,0.6)] [filter:drop-shadow(0_0_5px_rgba(56,189,248,1))]';

export function InteractiveOnyxLogo({ className = '' }: InteractiveOnyxLogoProps) {
    const cubeRef = useRef<HTMLDivElement>(null);
    const targetRotationRef = useRef({ x: -30, y: -45 });
    const currentRotationRef = useRef({ x: -30, y: -45 });
    const lastPointerRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const lastMoveTimeRef = useRef(Date.now());

    useEffect(() => {
        let animationFrame = 0;

        const handlePointerMove = (event: MouseEvent) => {
            const deltaX = event.clientX - lastPointerRef.current.x;
            const deltaY = event.clientY - lastPointerRef.current.y;

            targetRotationRef.current = {
                x: Math.max(-90, Math.min(90, targetRotationRef.current.x - deltaY * 0.3)),
                y: targetRotationRef.current.y + deltaX * 0.3,
            };

            lastPointerRef.current = { x: event.clientX, y: event.clientY };
            lastMoveTimeRef.current = Date.now();
        };

        window.addEventListener('mousemove', handlePointerMove);

        const animate = () => {
            const now = Date.now();
            const target = targetRotationRef.current;
            const current = currentRotationRef.current;

            if (now - lastMoveTimeRef.current > 1000) {
                target.y += 0.2;
                target.x += (-30 - target.x) * 0.02;
            }

            current.x += (target.x - current.x) * 0.05;
            current.y += (target.y - current.y) * 0.05;

            if (cubeRef.current) {
                cubeRef.current.style.transform = `rotateX(${current.x}deg) rotateY(${current.y}deg)`;
            }

            animationFrame = window.requestAnimationFrame(animate);
        };

        animationFrame = window.requestAnimationFrame(animate);
        return () => {
            window.cancelAnimationFrame(animationFrame);
            window.removeEventListener('mousemove', handlePointerMove);
        };
    }, []);

    return (
        <div
            className={`relative h-[260px] w-[260px] animate-[float-element_6s_ease-in-out_infinite] [perspective:1200px] ${className}`.trim()}
        >
            <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.16)_0%,transparent_70%)] blur-[55px]" />

            <div
                ref={cubeRef}
                className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]"
                style={{ transform: 'rotateX(-30deg) rotateY(-45deg)' }}
            >
                <div
                    className={faceBaseClassName}
                    style={{ width: `${CUBE_SIZE}px`, height: `${CUBE_SIZE}px`, marginLeft: `${-CUBE_SIZE / 2}px`, marginTop: `${-CUBE_SIZE / 2}px`, transform: `rotateY(0deg) translateZ(${CUBE_DEPTH}px)` }}
                >
                    <div className={ringClassName} />
                </div>

                <div
                    className={faceBaseClassName}
                    style={{ width: `${CUBE_SIZE}px`, height: `${CUBE_SIZE}px`, marginLeft: `${-CUBE_SIZE / 2}px`, marginTop: `${-CUBE_SIZE / 2}px`, transform: `rotateY(90deg) translateZ(${CUBE_DEPTH}px)` }}
                >
                    <div className={ringClassName} />
                </div>

                <div
                    className={faceBaseClassName}
                    style={{ width: `${CUBE_SIZE}px`, height: `${CUBE_SIZE}px`, marginLeft: `${-CUBE_SIZE / 2}px`, marginTop: `${-CUBE_SIZE / 2}px`, transform: `rotateX(90deg) translateZ(${CUBE_DEPTH}px)` }}
                >
                    <div className={ringClassName} />
                </div>

                <div
                    className={faceBaseClassName}
                    style={{ width: `${CUBE_SIZE}px`, height: `${CUBE_SIZE}px`, marginLeft: `${-CUBE_SIZE / 2}px`, marginTop: `${-CUBE_SIZE / 2}px`, transform: `rotateY(180deg) translateZ(${CUBE_DEPTH}px)` }}
                >
                    <div className={ringClassName} />
                </div>
                <div
                    className={faceBaseClassName}
                    style={{ width: `${CUBE_SIZE}px`, height: `${CUBE_SIZE}px`, marginLeft: `${-CUBE_SIZE / 2}px`, marginTop: `${-CUBE_SIZE / 2}px`, transform: `rotateY(-90deg) translateZ(${CUBE_DEPTH}px)` }}
                >
                    <div className={ringClassName} />
                </div>
                <div
                    className={faceBaseClassName}
                    style={{ width: `${CUBE_SIZE}px`, height: `${CUBE_SIZE}px`, marginLeft: `${-CUBE_SIZE / 2}px`, marginTop: `${-CUBE_SIZE / 2}px`, transform: `rotateX(-90deg) translateZ(${CUBE_DEPTH}px)` }}
                >
                    <div className={ringClassName} />
                </div>
            </div>
        </div>
    );
}
