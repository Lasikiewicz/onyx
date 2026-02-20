const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Let's use ripgrep to find all .tsx files containing `<svg`
const srcDir = path.join('c:', 'Github', 'onyx', 'renderer', 'src');

try {
    // Find all <svg> tags
    const output = execSync(`rg "<svg" "${srcDir}" -l`).toString().trim().split('\n');

    console.log('--- FIles with SVGs ---');
    let totalSvgs = 0;
    let totalAnimatedSvgs = 0;

    output.forEach(file => {
        if (!file) return;
        const content = fs.readFileSync(file, 'utf8');

        // Count total `<svg` occurrences
        const matches = content.match(/<svg/g);
        const count = matches ? matches.length : 0;

        // Count animated ones (has group-hover:scale or hover:scale)
        const animatedMatches = content.match(/<svg[^>]*(hover:scale|group-hover:[^"']*(scale|translate|rotate))/g);
        const animatedCount = animatedMatches ? animatedMatches.length : 0;

        totalSvgs += count;
        totalAnimatedSvgs += animatedCount;

        if (count > animatedCount) {
            console.log(`${path.basename(file)}: ${count} SVGs (${animatedCount} animated)`);
        }
    });

    console.log(`\nTotal SVGs: ${totalSvgs}`);
    console.log(`Animated SVGs: ${totalAnimatedSvgs}`);

} catch (e) {
    console.log("Error running rg:", e);
}
