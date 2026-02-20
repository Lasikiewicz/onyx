const fs = require('fs');
const path = require('path');

const targetPath = path.join('c:', 'Github', 'onyx', 'renderer', 'src', 'components', 'MenuBar.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Categories dropdown button & search icon
// For Categories button, the svgs don't have a parent `group` class. We need to apply `group` to the button.
content = content.replace(
    /className=\{`px-3 py-1\.5 bg-gray-700\/20 hover:bg-gray-700\/40 border border-gray-600\/30 rounded text-sm transition-all flex items-center gap-2/g,
    'className={`px-3 py-1.5 bg-gray-700/20 hover:bg-gray-700/40 border border-gray-600/30 rounded text-sm transition-all flex items-center gap-2 group'
);
content = content.replace(
    /<svg className="w-4 h-4"\s*fill="none"\s*stroke="currentColor"\s*viewBox="0 0 24 24">/g,
    '<svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 group-hover:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
);
// Categories search icon (inside the dropdown, no group needed as it doesn't hover, but let's make it animate when input is focused if possible via peer, or just leave it static since it's an input adornment. The plan says "Categories Search Icon" so let's use a group on the relative wrapper)
content = content.replace(
    /<div className="relative" onClick=\{\(e\) => e\.stopPropagation\(\)\}>/g,
    '<div className="relative group/search" onClick={(e) => e.stopPropagation()}>'
);
content = content.replace(
    /<svg className="w-3\.5 h-3\.5 text-gray-500 absolute left-2\.5 top-1\/2 transform -translate-y-1\/2"\s*fill="none"\s*stroke="currentColor"\s*viewBox="0 0 24 24">/g,
    '<svg className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 transform -translate-y-1/2 transition-all duration-300 group-focus-within/search:scale-110 group-focus-within/search:text-blue-400 group-hover/search:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
);

// 2. All Games icon
content = content.replace(
    /<svg className="w-4 h-4"\s*fill="none"\s*stroke="currentColor"\s*viewBox="0 0 24 24">\s*<path strokeLinecap="round" strokeLinejoin="round" strokeWidth=\{2\} d="M4 6h16M4 12h16M4 18h16"\s*\/>\s*<\/svg>/g,
    '<svg className="w-4 h-4 transition-transform duration-300 group-hover/cat:scale-110 group-hover/cat:rotate-90 group-hover/cat:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>'
);

// 3. Favorites icons (Two instances)
// First instance (in categories dropdown) - the button has group/cat already.
content = content.replace(
    /<svg className="w-4 h-4 text-yellow-500"\s*fill="currentColor"\s*viewBox="0 0 24 24">/g,
    '<svg className="w-4 h-4 text-yellow-500 transition-transform duration-300 group-hover/cat:scale-110 group-hover/cat:rotate-12" fill="currentColor" viewBox="0 0 24 24">'
);
// Second instance (Favorites standalone button) - Missing group class, let's add it.
content = content.replace(
    /className=\{`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1/g,
    'className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 group/fav'
);
content = content.replace(
    /<svg className="w-3 h-3 text-yellow-400"\s*fill="currentColor"\s*viewBox="0 0 24 24">/g,
    '<svg className="w-3 h-3 text-yellow-400 transition-transform duration-300 group-hover/fav:scale-125 group-hover/fav:rotate-12" fill="currentColor" viewBox="0 0 24 24">'
);

// 4. Pin Category icon
// Parent button has group inside group. The button itself doesn't have group. Let's trace it back. The button is inside `<div key={category} className="group flex items-center gap-1">`
content = content.replace(
    /<svg className="w-3\.5 h-3\.5"\s*fill=\{isPinned \? 'currentColor' : 'none'\}\s*stroke="currentColor"\s*viewBox="0 0 24 24">/g,
    '<svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" fill={isPinned ? \'currentColor\' : \'none\'} stroke="currentColor" viewBox="0 0 24 24">'
);

// 5. Hide VR / Apps / Hidden Titles
// These are all inside buttons that need a `group/vis` class first.
content = content.replace(
    /className="w-full flex items-center justify-between px-2 py-1\.5 rounded-lg hover:bg-white\/5 text-xs text-gray-400 transition-colors"/g,
    'className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 text-xs text-gray-400 transition-colors group/vis"'
);

// Hide VR Titles
content = content.replace(
    /<svg className="w-3\.5 h-3\.5"\s*fill="none"\s*stroke="currentColor"\s*viewBox="0 0 24 24">\s*<path strokeLinecap="round" strokeLinejoin="round" strokeWidth=\{2\} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"\s*\/>\s*<path strokeLinecap="round" strokeLinejoin="round" strokeWidth=\{2\} d="M2\.458 12C3\.732 7\.943 7\.523 5 12 5c4\.478 0 8\.268 2\.943 9\.542 7-1\.274 4\.057-5\.064 7-9\.542 7-4\.477 0-8\.268-2\.943-9\.542-7z"\s*\/>\s*<\/svg>/g,
    '<svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover/vis:scale-110 group-hover/vis:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>'
);
// Hide Apps Titles (Same icon as "All games" right now, but w-3.5)
content = content.replace(
    /<svg className="w-3\.5 h-3\.5"\s*fill="none"\s*stroke="currentColor"\s*viewBox="0 0 24 24">\s*<path strokeLinecap="round" strokeLinejoin="round" strokeWidth=\{2\} d="M4 6h16M4 10h16M4 14h16M4 18h16"\s*\/>\s*<\/svg>/g,
    '<svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover/vis:scale-110 group-hover/vis:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>'
);
// Show Hidden Games - Already has class layout. Let's add group class.
content = content.replace(
    /className=\{`w-full text-left px-2 py-1\.5 rounded-lg text-xs transition-all flex items-center gap-2 \$\{selectedCategory === 'hidden'/g,
    'className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 group/hid ${selectedCategory === \'hidden\''
);
content = content.replace(
    /<svg className="w-3\.5 h-3\.5"\s*fill="none"\s*stroke="currentColor"\s*viewBox="0 0 24 24">\s*<path strokeLinecap="round" strokeLinejoin="round" strokeWidth=\{2\} d="M13\.875 18\.825A10\.05 10\.05 0 0112 19c-4\.478 0-8\.268-2\.943-9\.543-7a9\.97 9\.97 0 011\.563-3\.029m5\.858\.908a3 3 0 114\.243 4\.243M9\.878 9\.878l4\.242 4\.242M9\.88 9\.88l-3\.29-3\.29m7\.532 7\.532l3\.29 3\.29M3 3l3\.59 3\.59m0 0A9\.953 9\.953 0 0112 5c4\.478 0 8\.268 2\.943 9\.543 7a10\.025 10\.025 0 01-4\.132 5\.736m0 0L21 21"\s*\/>\s*<\/svg>/g,
    '<svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover/hid:scale-110 group-hover/hid:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21" /></svg>'
);

// 6. Bug Report Icon
content = content.replace(
    /className="p-1\.5 hover:bg-gray-700\/40 rounded transition-colors flex items-center justify-center"\s*title="Report a Bug"/g,
    'className="p-1.5 hover:bg-gray-700/40 rounded transition-colors flex items-center justify-center group/bug" title="Report a Bug"'
);
content = content.replace(
    /<svg className="w-4 h-4 text-yellow-400"\s*fill="none"\s*stroke="currentColor"\s*viewBox="0 0 24 24">\s*<path strokeLinecap="round" strokeLinejoin="round" strokeWidth=\{2\} d="M12 9v2m0 4h\.01m-6\.938 4h13\.856c1\.54 0 2\.502-1\.667 1\.732-3L13\.732 4c-\.77-1\.333-2\.694-1\.333-3\.464 0L3\.34 16c-\.77 1\.333\.192 3 1\.732 3z"\s*\/>\s*<\/svg>/g,
    '<svg className="w-4 h-4 text-yellow-400 transition-transform duration-300 group-hover/bug:scale-110 group-hover/bug:rotate-[15deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>'
);

// 7. Toggle Console Icon
content = content.replace(
    /className="p-1\.5 hover:bg-gray-700\/40 rounded transition-colors flex items-center justify-center"\s*title="Toggle Console"/g,
    'className="p-1.5 hover:bg-gray-700/40 rounded transition-colors flex items-center justify-center group/console" title="Toggle Console"'
);
content = content.replace(
    /<svg className="w-4 h-4 text-gray-300"\s*fill="none"\s*stroke="currentColor"\s*viewBox="0 0 24 24">\s*<path strokeLinecap="round" strokeLinejoin="round" strokeWidth=\{2\} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"\s*\/>\s*<\/svg>/g,
    '<svg className="w-4 h-4 text-gray-300 transition-transform duration-300 group-hover/console:scale-110 group-hover/console:rotate-6 group-hover/console:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>'
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Update complete');
