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

console.log("Starting SVG animation applicator...");

let filesModified = 0;
let totalSvgsAnimated = 0;

walk(srcDir, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Ensure all standard buttons with SVGs have a 'group' class if they don't already.
    // We'll look for <button ...> that contains <svg ...>
    // This is tricky with simple regex, but we can do a pass to add group-hover to SVGs directly.

    // Actually, many SVGs are already inside buttons. We can try to add group to specific known button patterns,
    // OR we can just apply hover:scale-110 to the SVG directly if we don't need group!
    // `hover:scale-110` alone on the SVG works perfectly fine as long as the SVG has pointer events.
    // But wait, standard is `group-hover` on the parent button so the whole button triggers it.

    // Let's do a safe string replacement:
    // Find all `<svg className="...` and inject `transition-transform duration-300 hover:scale-110` 
    // if it's not already there. We don't necessarily need `group-hover` if we just put `hover:scale-110` on the SVG itself, 
    // but `group-hover` is better for button bounds.

    // Let's add hover:scale-110 AND transition-transform duration-300 to all SVGs.
    // It will scale when the user's cursor is *directly over* the SVG.
    // To make it scale when hovering the button, we need `group-hover`.
    // Let's just add both `hover:scale-110 group-hover:scale-110` just in case the parent is a group.

    let svgRegex = /<svg\s+([^>]*className=")([^"]*)(")/g;

    content = content.replace(svgRegex, (match, prefix, classString, suffix) => {
        // Skip if already animated
        if (classString.includes('scale-') || classString.includes('rotate-') || classString.includes('animate-') || classString.includes('translate-')) {
            return match;
        }

        // Add base transitions
        let newClass = classString;
        if (!newClass.includes('transition-')) newClass += ' transition-transform duration-300';

        // Add hover scale
        newClass += ' hover:scale-110 group-hover:scale-110';

        totalSvgsAnimated++;
        return `<svg ${prefix}${newClass.trim()}${suffix}`;
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        filesModified++;
        console.log(`Updated ${path.basename(filePath)}`);
    }
});

console.log(`\nFinished! Modified ${filesModified} files. Added animations to ${totalSvgsAnimated} SVGs.`);
