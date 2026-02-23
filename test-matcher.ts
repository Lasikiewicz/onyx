import { getGameMatcher } from './main/GameMatcher';

const matcher = getGameMatcher();

async function run() {
    console.log('Dependencies loaded.');
    const titles = ["Cyberpunk 2077", "FINAL FANTASY", "FINAL FANTASY II"];

    const cb2077_results = [
        { id: '1', title: 'Cyberpunk 2077', source: 'igdb' },
        { id: '2', title: 'G String', source: 'steamgriddb' },
    ];

    const ff_results = [
        { id: '3', title: 'FINAL FANTASY', source: 'igdb' },
        { id: '4', title: 'KAIJU No. 8 THE GAME', source: 'igdb' },
    ];

    for (const title of titles) {
        console.log(`\n=== Testing GameMatcher: ${title} ===`);
        const results = title === "Cyberpunk 2077" ? cb2077_results : ff_results;

        for (const res of results) {
            const score = matcher.calculateMatchScore({ title, source: 'manual', uuid: '1', installPath: 'C:\\', originalName: title, status: 'scanning' }, res as any);
            console.log(`- ${res.title} -> Confidence: ${score.confidence.toFixed(2)}, Reasons: ${score.reasons.join(', ')}`);
        }

        const matchResult = matcher.matchGame({ title, source: 'manual', uuid: '1', installPath: 'C:\\', originalName: title, status: 'scanning' }, results as any[]);
        if (matchResult) {
            console.log(`\nBEST MATCH: ${matchResult.game.title} (Confidence: ${matchResult.confidence.toFixed(2)})`);
        } else {
            console.log('\nNO MATCH FOUND');
        }
    }
}

run().catch(console.error);
