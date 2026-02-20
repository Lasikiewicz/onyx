const fs = require('fs');
const path = require('path');

const targetPath = path.join('c:', 'Github', 'onyx', 'renderer', 'src', 'components', 'MenuBar.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// Replace the inline SVG for the menu bar with the image overlay style 
// that we previously added for the dropdown menu item (but larger and continuously animated).

const oldSvgRegex = /<svg\s*width="24" height="24"\s*viewBox="0 0 512 512"\s*fill="none"\s*xmlns="http:\/\/www\.w3\.org\/2000\/svg"\s*className="w-6 h-6 transition-transform duration-300 group-hover\/onyx:rotate-\[15deg\] group-hover\/onyx:scale-110"\s*>[\s\S]*?<\/svg>/;

const newSvgLogic = `<div className="w-6 h-6 flex-shrink-0 relative overflow-hidden rounded-full transition-all duration-300 group-hover/onyx:scale-110 group-hover/onyx:shadow-[0_0_15px_rgba(14,165,233,0.5)]">
                <img 
                  src={iconPng} 
                  alt="Onyx Settings" 
                  className="absolute inset-0 w-full h-full opacity-90 group-hover/onyx:opacity-100 transition-opacity animate-[spin_10s_linear_infinite]" 
                  onError={(e) => { 
                    const target = e.target as HTMLImageElement; 
                    target.src = iconSvg; 
                  }} 
                />
              </div>`;

content = content.replace(oldSvgRegex, newSvgLogic);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Update complete');
