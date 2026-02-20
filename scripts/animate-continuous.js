const fs = require('fs');
const path = require('path');

const srcDir = path.join('c:', 'Github', 'onyx', 'renderer', 'src');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ?
            walk(dirPath, callback) : callback(path.join(dir, f));
    });
};

console.log("Starting SVG continuous animation applicator...");

let filesModified = 0;
let totalSvgsAnimated = 0;

walk(srcDir, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // We want to detect the type of SVG based on its contents
    // and apply specific continuous animations.

    // Regex to match entire <svg ...>...</svg> blocks
    // Wait, JS regex for matching <svg> to </svg> is safe enough here since SVGs aren't heavily nested
    let svgBlockRegex = /<svg\s+([^>]*className=")([^"]*)(")([\s\S]*?)<\/svg>/g;

    content = content.replace(svgBlockRegex, (match, prefix, classStr, suffix, innerContent) => {

        // Determine which animation to use
        let animationClass = 'animate-wobble'; // generic fallback

        if (innerContent.includes('M8 5v14l11-7z')) {
            animationClass = 'animate-play-pulse'; // Play button
        } else if (innerContent.includes('M11.049 2.927')) {
            animationClass = 'animate-gentle-bounce'; // Favorite
        } else if (innerContent.includes('M11 5H6a2 2 0')) {
            animationClass = 'animate-edit-pen'; // Edit Game
        } else if (innerContent.includes('M19 11H5m14 0a2') || innerContent.includes('M10.325 4.317c.426-1.756') || innerContent.includes('M13 16h-1v-4h-1m1-4h.01')) {
            animationClass = 'animate-gear-spin'; // Mod Manager, Settings, info
        } else if (innerContent.includes('M4 16l4.586-4.586a2')) {
            animationClass = 'animate-edit-image'; // Edit Images
        } else if (innerContent.includes('5 5a2 2 0 012-2h10')) {
            animationClass = 'animate-pin-shake'; // Pin
        } else if (innerContent.includes('M7 7h.01M7 3h5')) {
            animationClass = 'animate-edit-pen'; // Edit Categories
        }

        // Clean up old classes
        let newClass = classStr
            .replace(/hover:scale-\d+/g, '')
            .replace(/group-hover:scale-\d+/g, '')
            .replace(/transition-[\w-]+/g, '')
            .replace(/duration-\d+/g, '')
            .replace(/group-hover\/[^\s:]+:scale-110/g, '')
            .replace(/group-hover:rotate-[^\s]+/g, '')
            .replace(/group-hover:translate-[^\s]+/g, '')
            .replace(/hover:animate-[^\s]+/g, '')
            .replace(/group-hover:animate-[^\s]+/g, '')
            .trim();

        // Remove extra spaces
        newClass = newClass.replace(/\s+/g, ' ');

        // Add the new continuous hover classes
        // We add both hover:animate-x and group-hover:animate-x to cover standalone and nested svgs
        newClass += ` hover:${animationClass} group-hover:${animationClass}`;

        totalSvgsAnimated++;
        return `<svg ${prefix}${newClass.trim()}${suffix}${innerContent}</svg>`;
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        filesModified++;
        console.log(`Updated continuous anims for ${path.basename(filePath)}`);
    }
});

console.log(`\nFinished! Modified ${filesModified} files. Evaluated ${totalSvgsAnimated} SVGs for continuous animation.`);
