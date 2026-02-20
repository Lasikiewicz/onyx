const fs = require('fs');
const path = require('path');

const targetPath = path.join('c:', 'Github', 'onyx', 'renderer', 'src', 'components', 'MenuBar.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// The user requested to "use the style of the icon in the menu" for the "icon in the navbar".
// So we want the navbar icon to use the same nested circle/ring styling from icon.svg...
// BUT they also said "Also constantly animate the icons". Meaning all the SVG icons we animate on hover should maybe continuously animate,
// OR they meant the navbar icon and the 'Onyx Settings' item icon should both continuously animate.

// Let's replace the Onyx Settings button inside the navbar (which we just changed to a swirling png) back to the actual SVG.
// We will apply a continuous slow rotate `animate-[spin_10s_linear_infinite]` to the outer rings.
// We will also update the Onyx Settings dropdown menu item to match.

const navIconRegex = /<div className="w-6 h-6 flex-shrink-0 relative overflow-hidden rounded-full transition-all duration-300 group-hover\/onyx:scale-110 group-hover\/onyx:shadow-\[0_0_15px_rgba\(14,165,233,0\.5\)\]">\s*<img\s*src=\{iconPng\}\s*alt="Onyx Settings"[\s\S]*?<\/div>/;

const animatedSvgIcon = `<svg 
                width="24" height="24" 
                viewBox="0 0 512 512" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 transition-transform duration-300 group-hover/onyx:scale-110 drop-shadow-[0_0_8px_rgba(14,165,233,0.3)] group-hover/onyx:drop-shadow-[0_0_12px_rgba(14,165,233,0.8)]"
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

                <g className="origin-center animate-[spin_8s_linear_infinite]">
                  <g transform="translate(256, 143) scale(1, 0.58)">
                    <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" filter="url(#onyx-intenseGlow)" fill="none"/>
                    <circle r="55" stroke="#e0f2fe" strokeWidth="8" filter="url(#onyx-softGlow)" fill="none"/>
                  </g>

                  <g transform="translate(151, 325) rotate(60) scale(1, 0.58)">
                    <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" filter="url(#onyx-intenseGlow)" fill="none"/>
                    <circle r="55" stroke="#e0f2fe" strokeWidth="8" filter="url(#onyx-softGlow)" fill="none"/>
                  </g>

                  <g transform="translate(361, 325) rotate(-60) scale(1, 0.58)">
                    <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" filter="url(#onyx-intenseGlow)" fill="none"/>
                    <circle r="55" stroke="#e0f2fe" strokeWidth="8" filter="url(#onyx-softGlow)" fill="none"/>
                  </g>
                </g>
                        
                  <path d="M256 30 L465 150 L256 256 L47 150 L256 30Z" 
                        fill="white" 
                        fillOpacity="0.1"/>
              </svg>`;

content = content.replace(navIconRegex, animatedSvgIcon);

// Now do the same for the inner Onyx menu item:
const menuOnyxIconRegex = /<div className="w-5 h-5 flex-shrink-0 relative overflow-hidden rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:rotate-\[15deg\]"><img src=\{iconPng\} alt="Onyx" className="absolute inset-0 w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" onError=\{\(e\) => \{ const target = e\.target as HTMLImageElement; target\.src = iconSvg; \}\} \/><\/div>/;

const menuAnimatedSvgIcon = animatedSvgIcon.replace('w-6 h-6', 'w-5 h-5').replace('group-hover/onyx', 'group-hover');

content = content.replace(menuOnyxIconRegex, menuAnimatedSvgIcon);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Update complete');
