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

console.log("Starting 'group' class applicator...");

let filesModified = 0;
let totalElementsGrouped = 0;

walk(srcDir, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Regex to add 'group' to elements that need it
    // We'll target <button> and <a> tags, plus <div ... onClick/onMouseEnter/hover:> 
    // For safety, let's just target ALL <button, <a, and <div that contain 'onClick' or 'hover:'

    // Helper to process a particular tag
    function addGroupToTag(tagName, forceAll = false) {
        // Regex matches the opening tag, extracting className if it exists
        let tagRegex = new RegExp(`<${tagName}\\s+([^>]*?)>`, 'g');

        content = content.replace(tagRegex, (match, attrs) => {
            // Check if it's a self-closing tag or ends with >
            let closeMatch = match.match(/(\/?>)$/);
            let closing = closeMatch ? closeMatch[1] : '>';
            let coreAttrs = attrs.endsWith('/') ? attrs.slice(0, -1) : attrs;

            // If we aren't forcing all, check if it's interactive
            if (!forceAll && !coreAttrs.includes('onClick') && !coreAttrs.includes('hover:')) {
                return match;
            }

            // Check if className exists
            let classNameMatch = coreAttrs.match(/className=(["'{])(.*?)["'}]/);
            // Wait, let's do a simpler regex for className="..."
            classNameMatch = coreAttrs.match(/className="([^"]*)"/);

            if (classNameMatch) {
                let classes = classNameMatch[1];
                // Check if it already has 'group' (making sure it's surrounded by boundaries to avoid matching group-hover)
                if (/(^|\s)group(\s|$)/.test(classes) || /(^|\s)group\/[a-zA-Z0-9]+(\s|$)/.test(classes)) {
                    return match; // already grouped
                }

                // Add group
                let newClasses = `group ` + classes;
                let newAttrs = coreAttrs.replace(/className="[^"]*"/, `className="${newClasses}"`);
                totalElementsGrouped++;
                return `<${tagName} ${newAttrs}${closing}`;
            } else {
                // No className, we have to inject one.
                // Wait, it might have className={'string' + var}, which is messy to regex.
                // Let's only inject if there's no className AT ALL.
                if (!coreAttrs.includes('className=')) {
                    totalElementsGrouped++;
                    return `<${tagName} className="group" ${coreAttrs}${closing}`;
                }
                return match;
            }
        });
    }

    // Add groups to buttons and links unconditionally
    addGroupToTag('button', true);
    // Add group to divs that look interactive (have onClick or hover)
    addGroupToTag('div', false);
    // Add group to 'li' that look interactive
    addGroupToTag('li', false);

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        filesModified++;
        console.log(`Updated groups for ${path.basename(filePath)}`);
    }
});

console.log(`\nFinished! Modified ${filesModified} files. Added 'group' to ${totalElementsGrouped} elements.`);
