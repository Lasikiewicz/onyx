
export interface WebImageResult {
    url: string;
    thumbnail: string;
    title: string;
    width: number;
    height: number;
    source: string;
}

export class DuckDuckGoImageService {
    /**
     * Search for images on DuckDuckGo
     * This uses the i.js endpoint which returns a JSON-wrapped results list
     */
    async searchImages(query: string): Promise<WebImageResult[]> {
        console.log(`[DuckDuckGo] Searching for images: "${query}"`);

        try {
            // 1. Get the VQD (Verification Query Data) token required by DDG
            const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
            const tokenResponse = await fetch(tokenUrl);
            const tokenBody = await tokenResponse.text();

            const vqdMatch = tokenBody.match(/vqd=['"]([^'"]+)['"]/);
            if (!vqdMatch) {
                console.error('[DuckDuckGo] Failed to find VQD token');
                return [];
            }

            const vqd = vqdMatch[1];

            // 2. Fetch image results using the token
            const searchUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,`;

            const response = await fetch(searchUrl, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://duckduckgo.com/',
                    'Origin': 'https://duckduckgo.com',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                }
            });

            if (!response.ok) {
                throw new Error(`DuckDuckGo API returned ${response.status}`);
            }

            const data: any = await response.json();

            if (!data.results || !Array.isArray(data.results)) {
                return [];
            }

            return data.results.map((item: any) => ({
                url: item.image,
                thumbnail: item.thumbnail,
                title: item.title,
                width: item.width,
                height: item.height,
                source: item.source
            }));
        } catch (error) {
            console.error('[DuckDuckGo] Error searching images:', error);
            return [];
        }
    }
}
