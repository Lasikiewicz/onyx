const fs = require('fs');
const path = require('path');

const targetPath = path.join('c:', 'Github', 'onyx', 'renderer', 'src', 'components', 'MenuBar.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Add menuTimeoutRef
content = content.replace(
    'const onyxSettingsMenuRef = useRef<HTMLDivElement>(null);',
    'const onyxSettingsMenuRef = useRef<HTMLDivElement>(null);\n  const menuTimeoutRef = useRef<NodeJS.Timeout>();'
);

// 2. Replace the main button container and SVG logic
const oldBtnRegex = /<div className="relative" ref={onyxSettingsMenuRef}>[\s\S]*?(?=\{\/\* Dropdown Menu \*\/})\{\/\* Dropdown Menu \*\/}\s*\{isOnyxSettingsMenuOpen && \(\s*<div className="absolute left-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-\[240px\]">\s*<div className="p-1">/;

const newBtnLogic = `<div 
            className="relative group/onyx" 
            ref={onyxSettingsMenuRef}
            onMouseEnter={() => {
              if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
              setIsOnyxSettingsMenuOpen(true);
              setIsFilterDropdownOpen(false);
              setIsSortDropdownOpen(false);
              setIsLauncherDropdownOpen(false);
            }}
            onMouseLeave={() => {
              menuTimeoutRef.current = setTimeout(() => {
                setIsOnyxSettingsMenuOpen(false);
              }, 250);
            }}
          >
            <button
              onClick={() => {
                setIsOnyxSettingsMenuOpen(!isOnyxSettingsMenuOpen);
              }}
              className="p-1.5 hover:bg-gray-700/40 rounded transition-colors flex items-center justify-center group-hover/onyx:bg-gray-700/40"
              title="Onyx Settings"
            >
              <svg 
                width="24" height="24" 
                viewBox="0 0 512 512" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 transition-transform duration-300 group-hover/onyx:rotate-[15deg] group-hover/onyx:scale-110"
              >
                  <defs>
                    <linearGradient id="onyx-grad" x1="256" y1="20" x2="256" y2="492" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#334155"/>
                      <stop offset="1" stopColor="#020617"/>
                    </linearGradient>
                    <filter id="onyx-softGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="8" result="blur"/>
                      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                    </filter>
                    <filter id="onyx-intenseGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="12" result="blur"/>
                      <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0   0 0.8 0 0 0   0 0 1 0 0  0 0 0 1 0"/>
                    </filter>
                  </defs>
                  
                  <path d="M256 30 L465 150 V362 L256 482 L47 362 V150 L256 30Z" 
                        fill="url(#onyx-grad)" 
                        stroke="#0ea5e9" 
                        strokeWidth="8"
                        filter="url(#onyx-softGlow)"/>
                  
                  <path d="M256 256 L256 482 M256 256 L47 150 M256 256 L465 150" 
                        stroke="#1e293b" 
                        strokeWidth="4"/>

                  <g transform="translate(256, 143) scale(1, 0.58)" className="origin-center transition-all duration-300 group-hover/onyx:-translate-y-4">
                    <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" filter="url(#onyx-intenseGlow)" fill="none"/>
                    <circle r="55" stroke="#e0f2fe" strokeWidth="8" filter="url(#onyx-softGlow)" fill="none"/>
                  </g>

                  <g transform="translate(151, 325) rotate(60) scale(1, 0.58)" className="origin-center transition-all duration-300 group-hover/onyx:-translate-x-4 group-hover/onyx:translate-y-2">
                    <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" filter="url(#onyx-intenseGlow)" fill="none"/>
                    <circle r="55" stroke="#e0f2fe" strokeWidth="8" filter="url(#onyx-softGlow)" fill="none"/>
                  </g>

                  <g transform="translate(361, 325) rotate(-60) scale(1, 0.58)" className="origin-center transition-all duration-300 group-hover/onyx:translate-x-4 group-hover/onyx:translate-y-2">
                    <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" filter="url(#onyx-intenseGlow)" fill="none"/>
                    <circle r="55" stroke="#e0f2fe" strokeWidth="8" filter="url(#onyx-softGlow)" fill="none"/>
                  </g>
                        
                  <path d="M256 30 L465 150 L256 256 L47 150 L256 30Z" 
                        fill="white" 
                        fillOpacity="0.1"/>
              </svg>
            </button>

            {/* Dropdown Menu */}
            <div className={\`absolute left-0 top-full mt-2 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-2xl z-50 min-w-[260px] overflow-hidden transform origin-top-left transition-all duration-300 ease-out \${isOnyxSettingsMenuOpen ? 'scale-100 opacity-100 pointer-events-auto shadow-blue-500/10' : 'scale-[0.97] opacity-0 pointer-events-none'}\`}>
              <div className="p-1.5 space-y-0.5">`;

content = content.replace(oldBtnRegex, newBtnLogic);

// 3. Update the matching end logic
content = content.replace(
    /                  \)\}\r?\n\r?\n                <\/div>\r?\n              <\/div>\r?\n            \)\}\r?\n          <\/div>/,
    '                  )}\n\n                </div>\n              </div>\n          </div>'
);
content = content.replace(
    /                  \)\}\n\n                <\/div>\n              <\/div>\n            \)\}\n          <\/div>/,
    '                  )}\n\n                </div>\n              </div>\n          </div>'
); // double replace to catch both windows and linux ending if needed

// 4. Transform all the menu items to have animations

content = content.replace(
    /className="w-full flex items-center gap-3 px-4 py-2\.5 text-left text-gray-200 hover:bg-gray-700 rounded transition-colors whitespace-nowrap"/g,
    'className="w-full group flex items-center gap-3 px-3 py-2.5 text-left text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition-all duration-200 whitespace-nowrap"'
);
content = content.replace(
    /className="w-full flex items-center gap-3 px-4 py-2\.5 text-left text-slate-300 hover:bg-(.*?)-500\/10 hover:text-(.*?)-400 rounded transition-colors whitespace-nowrap"/g,
    'className="w-full group flex items-center gap-3 px-3 py-2.5 text-left text-gray-400 hover:bg-$1-500/10 hover:text-$2-300 rounded-lg transition-all duration-200 whitespace-nowrap"'
);
content = content.replace(
    /className="w-full flex items-center gap-3 px-4 py-2\.5 text-left text-red-400 hover:bg-gray-700 rounded transition-colors whitespace-nowrap"/g,
    'className="w-full group flex items-center gap-3 px-3 py-2.5 text-left text-red-400/80 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-all duration-200 whitespace-nowrap"'
);

// Menu item Texts translations
content = content.replace(
    /<span className="flex-1">(.*?)<\/span>/g,
    '<span className="flex-1 font-medium transition-transform duration-300 group-hover:translate-x-1">$1</span>'
);

// Icons
// Add Games
content = content.replace(
  /<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">\s*<path strokeLinecap="round" strokeLinejoin="round" strokeWidth=\{2\} d="M4 4v5h\.582m15\.356 2A8\.001 8\.001 0 004\.582 9m0 0H9m11 11v-5h-\.581m0 0a8\.003 8\.003 0 01-15\.357-2m15\.357 2H15" \/>\s*<\/svg>\s*<span className="flex-1 font-medium transition-transform duration-300 group-hover:translate-x-1">Add Games<\/span>/g,
  '<svg className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg><span className="flex-1 font-medium transition-transform duration-300 group-hover:translate-x-1">Add Games</span>'
);
// Game Manager
content = content.replace(
    /<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">\s*<path strokeLinecap="round" strokeLinejoin="round" strokeWidth=\{2\} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" \/>\s*<\/svg>\s*<span className="flex-1 font-medium transition-transform duration-300 group-hover:translate-x-1">Game Manager<\/span>/g,
    '<svg className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg><span className="flex-1 font-medium transition-transform duration-300 group-hover:translate-x-1">Game Manager</span>'
);
// Onyx Settings Image -> SVG styling
content = content.replace(
    /<img\s*src=\{iconPng\}\s*alt="Onyx"\s*className="w-5 h-5 flex-shrink-0"\s*onError=\{\(e\) => \{\s*const target = e\.target as HTMLImageElement;\s*target\.src = iconSvg;\s*\}\}\s*\/>/g,
    `<div className="w-5 h-5 flex-shrink-0 relative overflow-hidden rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[15deg]"><img src={iconPng} alt="Onyx" className="absolute inset-0 w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" onError={(e) => { const target = e.target as HTMLImageElement; target.src = iconSvg; }} /></div>`
);
// Support Onyx
content = content.replace(
    /<svg className="w-5 h-5 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">\s*<path strokeLinecap="round" strokeLinejoin="round" strokeWidth=\{2\} d="M4\.318 6\.318a4\.5 4\.5 0 000 6\.364L12 20\.364l7\.682-7\.682a4\.5 4\.5 0 00-6\.364-6\.364L12 7\.636l-1\.318-1\.318a4\.5 4\.5 0 00-6\.364 0z" \/>\s*<\/svg>\s*<span className="flex-1 font-medium transition-transform duration-300 group-hover:translate-x-1">Support Onyx<\/span>/g,
    '<svg className="w-5 h-5 text-rose-500/70 group-hover:text-rose-400 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg><span className="flex-1 font-medium transition-transform duration-300 group-hover:translate-x-1">Support Onyx</span>'
);
// Join Discord
content = content.replace(
    /<svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">\s*<path d="M8 12h\.01M12 12h\.01M16 12h\.01M21 12c0 4\.418-4\.03 8-9 8a9\.863 9\.863 0 01-4\.255-\.949L3 20l1\.395-3\.72C3\.512 15\.042 3 13\.574 3 12c0-4\.418 4\.03-8 9-8s9 3\.582 9 8z" \/>\s*<\/svg>\s*<span className="flex-1 font-medium transition-transform duration-300 group-hover:translate-x-1">Join Discord<\/span>/g,
    '<svg className="w-5 h-5 text-blue-500/70 group-hover:text-blue-400 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span className="flex-1 font-medium transition-transform duration-300 group-hover:translate-x-1">Join Discord</span>'
);
// Quick tips
content = content.replace(
    /<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">\s*<path strokeLinecap="round" strokeLinejoin="round" strokeWidth=\{2\} d="M12 6\.253v13m0-13C10\.832 5\.477 9\.246 5 7\.5 5S4\.168 5\.477 3 6\.253v13C4\.168 18\.477 5\.754 18 7\.5 18s3\.332\.477 4\.5 1\.253m0-13C13\.168 5\.477 14\.754 5 16\.5 5c1\.747 0 3\.332\.477 4\.5 1\.253v13C19\.832 18\.477 18\.247 18 16\.5 18c-1\.746 0-3\.332\.477-4\.5 1\.253" \/>\s*<\/svg>\s*<span className="flex-1 font-medium transition-transform duration-300 group-hover:translate-x-1">Quick tips<\/span>/g,
    '<svg className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:translate-x-1 group-hover:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg><span className="flex-1 font-medium transition-transform duration-300 group-hover:translate-x-1">Quick tips</span>'
);
// About
content = content.replace(
    /<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">\s*<path strokeLinecap="round" strokeLinejoin="round" strokeWidth=\{2\} d="M13 16h-1v-4h-1m1-4h\.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" \/>\s*<\/svg>\s*<span className="flex-1 font-medium transition-transform duration-300 group-hover:translate-x-1">About<\/span>/g,
    '<svg className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12 group-hover:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="flex-1 font-medium transition-transform duration-300 group-hover:translate-x-1">About</span>'
);
// Exit
content = content.replace(
    /<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">\s*<path strokeLinecap="round" strokeLinejoin="round" strokeWidth=\{2\} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" \/>\s*<\/svg>\s*<span className="flex-1 font-medium transition-transform duration-300 group-hover:translate-x-1">Exit<\/span>/g,
    '<svg className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg><span className="flex-1 font-medium transition-transform duration-300 group-hover:translate-x-1">Exit</span>'
);

// hr divider
content = content.replace(
    /<hr className="border-white\/10 my-2" \/>/g,
    '<div className="h-px bg-white/5 my-2 mx-2" />'
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Update complete');
