import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Game } from '../types/game';

interface GameLinksProps {
    game: Game;
    onUpdateLinks: (newLinks: Array<{ name: string; url: string; hidden?: boolean }>) => void;
    displayMode?: 'icons' | 'dropdown';
    visibleTypes?: Record<string, boolean>;
    displayOrder?: string[];
    buttonSize?: number;
    disableAnimatedIcons?: boolean;
}

// Default display order for game details (same as IGDB fetch order). Exported for settings.
export const LINK_DISPLAY_ORDER = [
    'Official Website', 'YouTube', 'Subreddit', 'Discord', 'Community Wiki', 'Wikipedia',
    'Facebook', 'Twitter', 'Twitch', 'Instagram', 'Steam', 'Epic', 'Xbox', 'PlayStation'
];

/** By default only these link types are visible; all others hidden. */
export const DEFAULT_VISIBLE_LINK_TYPES: Record<string, boolean> = {
    website: true,
    youtube: true,
    reddit: true,
    discord: true,
};

/** Map display name (e.g. "Official Website") to icon key (e.g. "website") for settings. */
export const LINK_DISPLAY_NAME_TO_KEY: Record<string, string> = {
    'Official Website': 'website',
    'YouTube': 'youtube',
    'Subreddit': 'reddit',
    'Discord': 'discord',
    'Community Wiki': 'wiki',
    'Wikipedia': 'wikipedia',
    'Facebook': 'facebook',
    'Twitter': 'twitter',
    'Twitch': 'twitch',
    'Instagram': 'instagram',
    'Steam': 'steam',
    'Epic': 'epic',
    'Xbox': 'xbox',
    'PlayStation': 'playstation',
};

function buildLinkOrderIndex(order: string[]) {
    return new Map(order.map((name, i) => [name.toLowerCase(), i]));
}

const defaultLinkOrderIndex = buildLinkOrderIndex(LINK_DISPLAY_ORDER);

function sortLinksByDisplayOrder(
    links: Array<{ name: string; url: string; hidden?: boolean }>,
    displayOrder?: string[]
) {
    const orderIndex = displayOrder && displayOrder.length > 0
        ? buildLinkOrderIndex(displayOrder)
        : defaultLinkOrderIndex;
    return [...links].sort((a, b) => {
        const ia = orderIndex.get((a.name || '').toLowerCase()) ?? 999;
        const ib = orderIndex.get((b.name || '').toLowerCase()) ?? 999;
        return ia - ib;
    });
}

// Default link icons: from files/icons, copied to renderer/public/link-icons (globe, wiki, twitter, etc.)
function getLinkIconsBase(): string {
    if (typeof window === 'undefined') return './';
    try {
        return new URL('link-icons/', window.location.href).href;
    } catch {
        return './link-icons/';
    }
}

const LOCAL_LINK_ICON_FILES: Record<string, string> = {
    website: 'globe.svg',
    youtube: 'youtube.svg',
    reddit: 'reddit.svg',
    discord: 'discord.svg',
    wiki: 'wiki.svg',
    wikipedia: 'wikipedia.svg',
    facebook: 'facebook.svg',
    twitter: 'twitter.svg',
    twitch: 'twitch.svg',
    instagram: 'instagram.svg',
    steam: 'steam.svg',
    epic: 'epic.svg',
    xbox: 'xbox.svg',
    playstation: 'playstation.svg',
};

/** Default icon URL: local packaged SVG (no CDN) */
function getDefaultIconUrl(iconKey: string): string | undefined {
    const file = LOCAL_LINK_ICON_FILES[iconKey];
    if (!file) return undefined;
    return getLinkIconsBase() + file;
}

// Brand Background Colors (exported for use in Game Manager Links tab)
export const BRAND_COLORS: Record<string, string> = {
    steam: '#171a21',
    reddit: '#FF4500',
    discord: '#5865F2',
    wikipedia: '#000000',
    wiki: '#00d6d6', // Cyan for Fandom/community wikis
    youtube: '#FF0000',
    twitch: '#9146FF',
    twitter: '#1DA1F2',
    epic: '#2a2a2a',
    gog: '#8B4DCC',
    xbox: '#107C10',
    playstation: '#003791',
    facebook: '#1877F2',
    instagram: '#E1306C',
    website: '#8b5cf6', // Purple for official website badges
    fallback: '#374151',
};

/** Map icon key to its hover animation class. */
const ICON_HOVER_ANIMATIONS: Record<string, string> = {
    website: 'group-hover:animate-link-globe-spin',
    youtube: 'group-hover:animate-play-pulse',
    reddit: 'group-hover:animate-gentle-bounce',
    discord: 'group-hover:animate-wobble',
    wiki: 'group-hover:animate-float',
    wikipedia: 'group-hover:animate-float',
    steam: 'group-hover:animate-gear-spin',
    epic: 'group-hover:animate-link-bounce-in',
    xbox: 'group-hover:animate-link-bounce-in',
    playstation: 'group-hover:animate-link-bounce-in',
    twitter: 'group-hover:animate-wobble',
    facebook: 'group-hover:animate-gentle-bounce',
    twitch: 'group-hover:animate-play-pulse',
    instagram: 'group-hover:animate-wobble',
    fallback: 'group-hover:animate-gentle-bounce',
};

// Official icons for major platforms as simple currentColor SVGs
const LinkIcons: Record<string, React.ReactNode> = {
    steam: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[85%] h-[85%]">
            <path d="M11.979 0C5.353 0 0 5.353 0 11.979c0 3.82 1.79 7.23 4.59 9.43l3.22-4.66c-.02-.12-.03-.23-.03-.35 0-1.87 1.52-3.39 3.39-3.39 1.14 0 2.15.56 2.76 1.42l4.02-1.68c.03-.23.05-.46.05-.7 0-3.66-2.97-6.62-6.62-6.62-3.66 0-6.62 2.96-6.62 6.62 0 .54.07 1.07.2 1.58l-2.42 3.5c-1.39-1.54-2.22-3.57-2.22-5.78C.32 5.53 5.53.32 11.979.32c6.45 0 11.66 5.21 11.66 11.659 0 6.45-5.21 11.66-11.66 11.66-1.57 0-3.07-.31-4.44-.86l2.12-3.04c.73.22 1.5.33 2.31.33 4.41 0 7.99-3.58 7.99-7.99 0-4.41-3.58-7.99-7.99-7.99z" />
        </svg>
    ),
    reddit: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[85%] h-[85%]">
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.362.776-.598 1.3-.598.937 0 1.7.764 1.7 1.7 0 .764-.508 1.405-1.205 1.604.02.164.03.332.03.5 0 2.91-3.664 5.28-8.183 5.28-4.52 0-8.183-2.37-8.183-5.28 0-.168.01-.336.03-.5-.697-.199-1.205-.84-1.205-1.604 0-.936.763-1.7 1.7-1.7.524 0 .992.236 1.3.598 1.194-.856 2.85-1.418 4.674-1.488l.896-4.195c.03-.14.17-.233.313-.204l3.193.673a1.25 1.25 0 0 1 1.25-1.25zm-6.273 8.356c-.63 0-1.144.514-1.144 1.144s.514 1.144 1.144 1.144c.63 0 1.144-.514 1.144-1.144s-.514-1.144-1.144-1.144zm4.525 0c-.63 0-1.144.514-1.144 1.144s.514 1.144 1.144 1.144c.63 0 1.144-.514 1.144-1.144s-.514-1.144-1.144-1.144zm-7.005 3.328a.488.488 0 0 0-.256.88c.03.016 1.196.861 3.253.861 2.057 0 3.223-.845 3.253-.861a.487.487 0 1 0-.512-.83c-.01.006-1.012.716-2.74.716-1.728 0-2.731-.71-2.741-.716a.487.487 0 0 0-.257-.05z" />
        </svg>
    ),
    discord: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[85%] h-[85%]">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
    ),
    wikipedia: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[85%] h-[85%] opacity-90">
            <path d="M12.09 3.02L8.51 13.92 5 3.02H1.09L6.5 19.5h3.96l4.47-16.48h-2.94zm7.25 0l-3.58 10.9-3.51-10.9H8.31L13.72 19.5h3.95l4.47-16.48h-2.8z" />
        </svg>
    ),
    youtube: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[85%] h-[85%]">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
    ),
    twitch: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[85%] h-[85%]">
            <path d="M11.571 4.714h1.715v5.143H11.57v-5.143zm4.715 0H18v5.143h-1.714v-5.143zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0H6zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714v9.429z" />
        </svg>
    ),
    twitter: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[85%] h-[85%]">
            <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.292 19.49h2.039L6.486 3.24H4.298l13.311 17.403z" />
        </svg>
    ),
    facebook: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[85%] h-[85%]">
            <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103v3.328h-2.328c-2.144 0-2.422.973-2.422 2.458v1.67h4.631l-.478 3.667h-4.153v7.98h-2.576z" />
        </svg>
    ),
    instagram: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[85%] h-[85%]">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
    ),
    epic: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[80%] h-[80%]">
            <path d="M12.004.09l9.366 2.659v18.711L12.004 24 .81 21.46V2.749L12.004.09zm0 3.251l-7.394 2.1v13.5l7.394 2.091 7.393-2.091v-13.5L12.004 3.34zm-3.619 4.14v7.327h5.111v1.611H6.772V5.867h6.774v1.613H8.385zm5.111 2.26v1.612H8.385V9.74h5.111z" />
        </svg>
    ),
    gog: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[85%] h-[85%]">
            <path d="M23.166 10.662l-.766-.757-.751-.734-.848-.847-1.157-1.134-1.284-1.266-1.503-1.463-1.638-1.536-1.742-1.547-1.89-1.505C11.378-.066 11.23-.02 10.975.05L9.608.4l-1.4.522-1.391.66-1.488.852-1.504 1.055L2.4 4.672 1.258 6.007.828 6.551v12.275l.18 1.488.243 1.293.454 1.246.684.975.792.743 1.056.666 1.138.563 1.187.424 1.347.284 1.4.153 1.428.028c1.37 0 2.646-.176 3.822-.5 1.18-.33 2.222-.843 3.12-1.528.91-.7 1.62-1.594 2.122-2.65.494-1.07.728-2.348.728-3.791V1.157c0-.28-.242-.505-.531-.505h-3.235c-.29 0-.53.224-.53.505v15.908c0 1.2-.5 2.144-1.517 2.822-1.01.682-2.4 1.026-4.148 1.026-1.16 0-2.125-.133-2.89-.39-1.05-.353-1.82-.962-2.302-1.82-.486-.87-.723-2.022-.723-3.447V7.075c0-1.64.38-2.906 1.144-3.774.773-.883 1.942-1.334 3.51-1.353v3.708l.19.066.398-.243.684-.522L8 4.394l.87-.96 1-.95 1.096-.948 1.222-.926 1.312-.907 1.352-.846 1.343-.8 1.385-.722c-.416-.31-1.002-.516-1.748-.616-1.14-.144-2.226.06-3.264.63-.58.337-1.12.756-1.616 1.26a11.535 11.535 0 0 0-1.282 1.545c-.443.655-.785 1.383-1.012 2.166A9.457 9.457 0 0 0 9.24 7.6v10.59c0 1.58.267 2.87.79 3.86a4.234 4.234 0 0 0 2.146 1.838c.954.373 2.054.55 3.303.55 1.69 0 3.037-.417 4.026-1.258a6.394 6.394 0 0 0 1.93-3.15c.34-1.01.503-2.27.503-3.75v-.8z" />
        </svg>
    ),
    xbox: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[85%] h-[85%]">
            <path d="M11.895 1.09C5.556 1.09.412 6.234.412 12.573c0 6.339 5.144 11.483 11.483 11.483 6.339 0 11.482-5.144 11.482-11.483 0-6.339-5.143-11.483-11.482-11.483h.001zm-5.02 4.414a6.324 6.324 0 0 1 4.542-1.89h.244a6.6 6.6 0 0 1 4.532 1.84c-3.15 2.227-6.524 5.922-6.524 5.922s-1.88-2.673-2.794-5.872zm-2.887 2.053c.633 3.65 3.336 7.42 3.336 7.42s5.152-4.526 8.525-4.526c.745 0 1.493.18 2.185.348v.01s-4.062 1.4-6.307 4.96c-1.808-1.558-3.08-3.414-3.526-4.59.102.13.208.261.318.39-3.266 1.34-4.53 4.01-4.53 4.01a8.682 8.682 0 0 1-1.408-4.832c0-1.12.215-2.193.615-3.18h.001zm14.187.351a8.6 8.6 0 0 1 1.748 5.263 8.7 8.7 0 0 1-1.34 4.67s-1.503-3.056-4.87-4.5c2.406-3.766 4.462-5.433 4.462-5.433zm-4.499 7.641c2.25 1.107 4.29 3.518 4.29 3.518a8.682 8.682 0 0 1-5.904 2.45c-2.31 0-4.41-.9-5.96-2.37.006-.008 2.37-2.308 5.86-2.433l.006-.001a4.914 4.914 0 0 1 1.708 1.166 4.935 4.935 0 0 1-1.282-2.345l1.282.015z" />
        </svg>
    ),
    playstation: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[85%] h-[85%]">
            <path d="M22.844 16.591a.53.53 0 0 1-.295.45c-.37.218-1.551 1.258-4.568 2.05-4.011 1.056-6.551 1-6.551 1v-1.636s2.51.085 5.857-.866c2.736-.78 3.578-1.56 3.73-1.64.103-.053.155-.162.032-.249-1.298-1.1-6.046-2.094-9.62-2.463v-1.777c5.18.397 10.99 1.543 11.378 2.87.054.182.203.882.037 1.26zM2.859 18.067s2.348-.718 5.889-1.371l-.004-1.636c-2.822.516-4.66.974-5.228 1.156-.168.053-.25.163-.122.253.303.208 1.016.592 2.651.983l-.538 1.587c-3.136-1.026-4.406-1.921-4.492-2.12-.132-.303.205-.889.205-.889.37-.417 1.34-1.127 4.091-1.916 1.486-.427 3.32-.832 5.093-1.151v-1.78a29.079 29.079 0 0 0-4.303.957c-3.791 1.066-6.105 2.1-6.105 3.063 0 1.296 4.318 2.378 6.579 2.92 -.213.57-.306.87-.306.87-.202.493-2.956-.379-3.41-.546zM10.435 23.3V2.413c0-.074.03-.12.09-.12h1.666c.06 0 .09.046.09.12v20.887h-1.846zM12.28 11.235c-5.289.873-6.903.95-6.903 2.155 0 .285.342.366.342.366s1.698-.38 6.561-.951z" />
            <path d="M16.92 5.38s-2.73-1-4.542-1.022L12.38.167S21.6.438 21.6 3.197c0 1.393-2.458 2.18-4.68 2.181zM10.43 14.397v-1.802s7.842-1.528 8.016-1.564c-.496.064-.997.106-1.503.125-2.022.079-6.513.535-6.513.535l-.014 1.637s1.332-.2 2.569-.33c1.94-.207 2.05-.28 2.05-.28-.01.077-.282.253-.332.277-1.151.528-5.32 1.353-8.835 1.579l-.022 1.695c5.38-.456 12.029-2.071 12.029-3.238 0-.968-3.042-1.864-7.445-2.615v-1.144c5.051.815 8.799 1.838 8.799 3.13 0 1.874-7.518 3.59-13.801 4.145v-1.694c2.815-.223 5.097-.689 5.002-.452z" />
        </svg>
    ),
    wiki: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[80%] h-[80%]">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    ),
    website: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[85%] h-[85%]">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
    )
};

const FallbackIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-[85%] h-[85%]">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
);


/** Renders official brand icon from Simple Icons CDN, or custom iconUrl; inline fallback on error.
 * darkBackground: true = white icon (default), false = dark icon. */
export function LinkIcon({
    iconKey,
    className = 'w-[85%] h-[85%]',
    customIconUrl,
    darkBackground = true
}: { iconKey: string; className?: string; customIconUrl?: string | null; darkBackground?: boolean }) {
    const [useFallback, setUseFallback] = useState(false);
    const defaultUrl = getDefaultIconUrl(iconKey);
    const url = (customIconUrl && customIconUrl.trim()) ? customIconUrl : defaultUrl;
    const inlineIcon = LinkIcons[iconKey] || FallbackIcon;
    const isCustom = !!(customIconUrl && customIconUrl.trim());
    const iconColorClass = darkBackground ? 'text-white' : 'text-gray-800';
    const iconColorStyle = darkBackground ? { color: '#ffffff' } : { color: 'rgb(31 41 55)' };
    const imgFilter = isCustom ? undefined : darkBackground ? 'brightness(0) invert(1)' : 'brightness(0)';

    if (useFallback || !url) {
        return <span className={`flex items-center justify-center ${iconColorClass} ${className}`} style={iconColorStyle}>{inlineIcon}</span>;
    }
    return (
        <span className={`flex items-center justify-center ${iconColorClass} ${className}`} style={iconColorStyle}>
            <img
                src={url}
                alt=""
                className="object-contain object-center max-w-full max-h-full w-full h-full"
                style={{ ...(imgFilter ? { filter: imgFilter } : {}) }}
                onError={() => setUseFallback(true)}
            />
        </span>
    );
}

/** Search query for finding an SVG icon in browser (e.g. "Steam logo svg") */
export function getLinkIconSearchQuery(linkName: string): string {
    const name = (linkName || 'link').trim();
    return encodeURIComponent(`${name} logo svg icon`);
}

export const inferLinkKey = (url: string, name: string): string => {
    const urlLower = url.toLowerCase();
    const nameLower = name.toLowerCase();

    if (urlLower.includes('steamcommunity') || urlLower.includes('store.steampowered')) return 'steam';
    if (urlLower.includes('reddit')) return 'reddit';
    if (urlLower.includes('discord')) return 'discord';
    if (urlLower.includes('wikipedia')) return 'wikipedia';
    if (urlLower.includes('fandom') || urlLower.includes('wiki') || nameLower.includes('wiki')) return 'wiki';
    if (urlLower.includes('youtube')) return 'youtube';
    if (urlLower.includes('twitch')) return 'twitch';
    if (urlLower.includes('xbox') || nameLower.includes('xbox')) return 'xbox';
    if (urlLower.includes('playstation') || nameLower.includes('playstation')) return 'playstation';
    if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'twitter';
    if (urlLower.includes('facebook')) return 'facebook';
    if (urlLower.includes('instagram')) return 'instagram';
    if (urlLower.includes('epicgames')) return 'epic';
    if (urlLower.includes('gog')) return 'gog';
    if (urlLower.includes('official') || nameLower.includes('official') || nameLower.includes('website')) return 'website';

    if (nameLower.includes('steam')) return 'steam';
    if (nameLower.includes('reddit')) return 'reddit';
    if (nameLower.includes('discord')) return 'discord';
    if (nameLower.includes('wikipedia')) return 'wikipedia';
    if (nameLower.includes('youtube')) return 'youtube';
    if (nameLower.includes('xbox')) return 'xbox';
    if (nameLower.includes('playstation')) return 'playstation';
    if (nameLower.includes('twitter')) return 'twitter';

    return 'fallback';
};

export const GameLinks: React.FC<GameLinksProps> = ({
    game,
    onUpdateLinks,
    displayMode = 'icons',
    visibleTypes,
    displayOrder,
    buttonSize = 14,
    disableAnimatedIcons = false,
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
    const [showHidden, setShowHidden] = useState(false);
    const [upArrowPopoverRect, setUpArrowPopoverRect] = useState<{ right: number; bottom: number } | null>(null);
    const [iconsWhite, setIconsWhite] = useState(true);
    const menuRef = useRef<HTMLDivElement>(null);
    const upArrowButtonRef = useRef<HTMLButtonElement>(null);
    const upArrowPopoverRef = useRef<HTMLDivElement>(null);
    const darkBg = iconsWhite;

    // Close up-arrow popover when clicking outside (it's portaled to body)
    useEffect(() => {
        if (!showHidden) return;
        const onMouseDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                upArrowButtonRef.current?.contains(target) ||
                upArrowPopoverRef.current?.contains(target)
            ) return;
            setShowHidden(false);
            setUpArrowPopoverRect(null);
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [showHidden]);

    const links = sortLinksByDisplayOrder(game.links || [], displayOrder);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };
        if (contextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [contextMenu]);

    if (!links || links.length === 0) return null;

    // Filter by visibleTypes: show on bar only when explicitly true (when visibleTypes provided)
    const visibleByTypeLinks = links.filter(link => {
        if (!visibleTypes || Object.keys(visibleTypes).length === 0) return true;
        const key = inferLinkKey(link.url, link.name);
        return visibleTypes[key] === true;
    });

    // Process links: on-bar vs not on bar (for up-arrow popover)
    const processedLinks = visibleByTypeLinks.map((l) => {
        const originalIndex = links.findIndex(orig => orig.url === l.url && orig.name === l.name);
        return { ...l, originalIndex };
    });

    const visibleLinks = processedLinks.filter(l => !l.hidden);

    // Links not on the bar: hidden by default (Settings) OR user-hidden (right-click). These show in the up-arrow popover.
    const linksNotOnBar = links
        .map((l, idx) => ({ ...l, originalIndex: idx }))
        .filter(l => {
            if (!visibleTypes || Object.keys(visibleTypes).length === 0) return !!l.hidden;
            const key = inferLinkKey(l.url, l.name);
            const visibleByType = visibleTypes[key] === true;
            return !visibleByType || !!l.hidden;
        });

    // All links with originalIndex for the right-click menu (includes hidden-by-default so user can open, reorder, hide)
    const allLinksForContextMenu = links.map((l, idx) => ({ ...l, originalIndex: idx }));

    const handleOpenLink = (e: React.MouseEvent, url: string) => {
        e.preventDefault();
        e.stopPropagation();
        window.electronAPI.openExternal(url);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const menuWidth = 320;
        let x = e.clientX;
        let y = e.clientY;
        if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
        if (x < 10) x = 10;
        if (y < 10) y = 10;
        if (y > window.innerHeight - 20) y = window.innerHeight - 20;
        setContextMenu({ x, y });
    };

    const toggleHideLink = (originalIndex: number) => {
        const newLinks = [...links];
        newLinks[originalIndex] = { ...newLinks[originalIndex], hidden: !newLinks[originalIndex].hidden };
        onUpdateLinks(newLinks);
        // Do not close context menu here to allow rapid edits
    };

    const moveLink = (originalIndex: number, direction: 'left' | 'right') => {
        const newLinks = [...links];
        const targetIndex = direction === 'left' ? originalIndex - 1 : originalIndex + 1;
        if (targetIndex >= 0 && targetIndex < newLinks.length) {
            [newLinks[originalIndex], newLinks[targetIndex]] = [newLinks[targetIndex], newLinks[originalIndex]];
            onUpdateLinks(newLinks);
        }
        // Do not close context menu here to allow rapid edits
    };

    if (displayMode === 'dropdown') {
        return (
            <div
                className="relative group inline-block"
                onMouseEnter={() => setIsDropdownOpen(true)}
                onMouseLeave={() => setIsDropdownOpen(false)}
            >
                <button
                    className="px-4 py-2 hover:bg-white/10 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    style={{ fontSize: `${buttonSize}px` }}
                >
                    <div className="w-5 h-5 flex-shrink-0 opacity-70">
                        {FallbackIcon}
                    </div>
                    Links
                    <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isDropdownOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden py-1 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {visibleLinks.map((link, idx) => {
                            const iconKey = inferLinkKey(link.url, link.name);

                            return (
                                <button
                                    key={idx}
                                    onClick={(e) => handleOpenLink(e, link.url)}
                                    className="w-full px-4 py-2 hover:bg-white/10 flex items-center gap-3 text-gray-200 hover:text-white transition-colors text-left"
                                >
                                    <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded text-white shadow-sm">
                                        <LinkIcon iconKey={iconKey} className="w-[85%] h-[85%]" customIconUrl={(link as { iconUrl?: string }).iconUrl} darkBackground={darkBg} />
                                    </div>
                                    <span className="text-sm truncate">{link.name}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 relative">
            {visibleLinks.map((link, idx) => {
                const iconKey = inferLinkKey(link.url, link.name);

                return (
                    <button
                        key={idx}
                        onClick={(e) => handleOpenLink(e, link.url)}
                        onContextMenu={(e) => handleContextMenu(e)}
                        className="group relative rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center overflow-hidden border border-white/5 hover:border-white/20 shadow-lg"
                        title={link.name}
                        style={{
                            width: `${buttonSize * 2.8}px`,
                            height: `${buttonSize * 2.8}px`
                        }}
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                        <div className={`w-full h-full relative z-10 flex items-center justify-center text-white drop-shadow-md transition-all duration-300 group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.4)] ${disableAnimatedIcons ? '' : (ICON_HOVER_ANIMATIONS[iconKey] || ICON_HOVER_ANIMATIONS.fallback)}`}>
                            <LinkIcon iconKey={iconKey} className="w-[85%] h-[85%]" customIconUrl={(link as { iconUrl?: string }).iconUrl} darkBackground={darkBg} />
                        </div>
                    </button>
                );
            })}

            {linksNotOnBar.length > 0 && (
                <div className="relative">
                    <button
                        ref={upArrowButtonRef}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (showHidden) {
                                setShowHidden(false);
                                setUpArrowPopoverRect(null);
                            } else {
                                const rect = upArrowButtonRef.current?.getBoundingClientRect();
                                if (rect) {
                                    setUpArrowPopoverRect({
                                        right: window.innerWidth - rect.right,
                                        bottom: window.innerHeight - rect.top + 8,
                                    });
                                }
                                setShowHidden(true);
                            }
                        }}
                        className={`text-gray-500 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 ${showHidden ? 'rotate-180 bg-white/5 text-blue-400' : ''} border border-transparent hover:border-white/10 flex items-center justify-center`}
                        title="Show more links"
                        style={{ width: `${buttonSize * 2.8}px`, height: `${buttonSize * 2.8}px` }}
                    >
                        <img src={getLinkIconsBase() + 'up-fill.svg'} alt="" className="w-[50%] h-[50%] object-contain opacity-80" style={{ filter: darkBg ? 'brightness(0) invert(1)' : 'brightness(0)' }} />
                    </button>

                    {showHidden && upArrowPopoverRect && createPortal(
                        <div
                            ref={upArrowPopoverRef}
                            className="fixed p-2 bg-gray-900/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col gap-1 min-w-[180px] max-w-[260px] max-h-[70vh] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-300"
                            style={{
                                right: upArrowPopoverRect.right,
                                bottom: upArrowPopoverRect.bottom,
                                zIndex: 99999,
                            }}
                        >
                            {linksNotOnBar.map((link, idx) => {
                                const iconKey = inferLinkKey(link.url, link.name);

                                return (
                                    <button
                                        key={idx}
                                        onClick={(e) => {
                                            handleOpenLink(e, link.url);
                                            setShowHidden(false);
                                            setUpArrowPopoverRect(null);
                                        }}
                                        onContextMenu={(e) => handleContextMenu(e)}
                                        className="group rounded-lg transition-all duration-200 hover:bg-white/10 flex items-center gap-2 p-2 text-left border border-white/5 opacity-80 hover:opacity-100"
                                        title={link.hidden ? `${link.name} (Hidden)` : link.name}
                                    >
                                        <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center text-white grayscale group-hover:grayscale-0 transition-all ${disableAnimatedIcons ? '' : (ICON_HOVER_ANIMATIONS[iconKey] || ICON_HOVER_ANIMATIONS.fallback)}`}>
                                            <LinkIcon iconKey={iconKey} className="w-[85%] h-[85%]" customIconUrl={(link as { iconUrl?: string }).iconUrl} darkBackground={darkBg} />
                                        </div>
                                        <span className="text-sm text-gray-200 group-hover:text-white truncate flex-1 min-w-0">
                                            {link.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>,
                        document.body
                    )}
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && createPortal(
                <div
                    ref={menuRef}
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={(e) => e.stopPropagation()}
                    className="fixed z-[99999] w-[320px] max-h-[90vh] bg-gray-950/98 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl py-2 flex flex-col animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/5"
                    style={{ left: contextMenu.x, top: contextMenu.y, transform: 'translateY(-100%)' }}
                >
                    <div className="px-3 pb-2 text-[10px] uppercase tracking-[0.1em] font-black text-gray-400 border-b border-white/5 mb-2 flex items-center justify-between shrink-0">
                        <span>Link Management</span>
                        <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white transition-colors">
                            <span className="text-xs normal-case font-normal">Icons:</span>
                            <button
                                type="button"
                                onClick={() => setIconsWhite(true)}
                                className={`px-2 py-0.5 rounded text-xs ${iconsWhite ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                White
                            </button>
                            <button
                                type="button"
                                onClick={() => setIconsWhite(false)}
                                className={`px-2 py-0.5 rounded text-xs ${!iconsWhite ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Black
                            </button>
                        </label>
                    </div>

                    <div className="overflow-x-hidden overflow-y-auto flex-1 custom-scrollbar min-h-0 px-2">
                        <div className="flex flex-col gap-0.5">
                            {allLinksForContextMenu.map((link, idx) => {
                                const iconKey = inferLinkKey(link.url, link.name);
                                return (
                                    <div key={idx} className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors ${link.hidden ? 'opacity-50' : ''}`}>
                                        {/* Link Info */}
                                        <button
                                            onClick={(e) => {
                                                handleOpenLink(e, link.url);
                                                setContextMenu(null);
                                            }}
                                            className="flex-1 flex items-center gap-2 min-w-0 text-left"
                                        >
                                            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded shadow-sm grayscale group-hover:grayscale-0 transition-all">
                                                <LinkIcon iconKey={iconKey} className="w-[85%] h-[85%]" customIconUrl={(link as { iconUrl?: string }).iconUrl} darkBackground={darkBg} />
                                            </div>
                                            <span className="text-sm text-gray-300 group-hover:text-white font-medium">
                                                {link.name}
                                            </span>
                                        </button>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {/* Priority Up */}
                                            <button
                                                onClick={() => moveLink(link.originalIndex, 'left')}
                                                disabled={link.originalIndex === 0}
                                                className="p-1 text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Move Priority Up"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                                                </svg>
                                            </button>

                                            {/* Priority Down */}
                                            <button
                                                onClick={() => moveLink(link.originalIndex, 'right')}
                                                disabled={link.originalIndex === links.length - 1}
                                                className="p-1 text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Move Priority Down"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            <div className="w-px h-4 bg-white/10 mx-0.5"></div>

                                            {/* Toggle Hidden */}
                                            <button
                                                onClick={() => toggleHideLink(link.originalIndex)}
                                                className="p-1 text-gray-500 hover:text-white hover:bg-white/10 rounded transition-colors"
                                                title={link.hidden ? "Show Link" : "Hide Link"}
                                            >
                                                {link.hidden ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.956 9.956 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <p className="px-3 py-2 mt-1 border-t border-white/5 text-xs text-gray-300 shrink-0">
                        To fix a wrong URL, edit in Game Manager → Links tab.
                    </p>
                </div>, document.body
            )}
        </div>
    );
};
