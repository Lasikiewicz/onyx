import { useRef, useState } from 'react';
import type { Game } from '../../types/game';
import type { StagedGame } from '../../types/importer';
import type { EditableGameFields } from '../../types/EditableGame';

type ImageType = 'boxart' | 'banner' | 'logo' | 'icon' | 'alternativeBanner';

interface ImageResultBuckets {
  boxart: any[];
  banner: any[];
  alternativeBanner: any[];
  logo: any[];
  icon: any[];
}

interface UseGamePropertiesImagesOptions {
  editedFields: EditableGameFields;
  game: Game | StagedGame;
  isStaged: boolean;
  setEditedFields: React.Dispatch<React.SetStateAction<EditableGameFields>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setSuccess: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveTab: React.Dispatch<React.SetStateAction<'metadata' | 'images' | 'links' | 'modManager'>>;
}

const emptyResults = (): ImageResultBuckets => ({
  boxart: [],
  banner: [],
  alternativeBanner: [],
  logo: [],
  icon: [],
});

export const useGamePropertiesImages = ({
  editedFields,
  game,
  isStaged,
  setEditedFields,
  setError,
  setSuccess,
  setActiveTab,
}: UseGamePropertiesImagesOptions) => {
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [activeImageSearchTab, setActiveImageSearchTab] = useState<'all' | ImageType>('all');
  const [steamGridDBResults, setSteamGridDBResults] = useState<ImageResultBuckets>(emptyResults);
  const [isFastSearching, setIsFastSearching] = useState(false);
  const [fastSearchResults, setFastSearchResults] = useState<any[]>([]);
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set());

  const fastSearchRunIdRef = useRef(0);
  const imageSearchRunIdRef = useRef(0);
  const fastSearchActiveRunIdRef = useRef(0);

  const resetImageState = () => {
    setFailedImageUrls(new Set());
    setImageSearchQuery('');
  };

  const clearImageResults = () => {
    setSteamGridDBResults(emptyResults());
    setFailedImageUrls(new Set());
  };

  const getNumericSteamAppId = () => {
    const rawAppId = (game as any).appId || (game as any).steamAppId;
    return rawAppId && /^\d+$/.test(String(rawAppId)) ? String(rawAppId) : undefined;
  };

  const normalizeImageUrl = (value?: string) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const lower = trimmed.toLowerCase();
    if (lower === 'null' || lower === 'undefined' || lower === 'n/a') return undefined;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (
      lower.startsWith('https://') ||
      lower.startsWith('http://') ||
      lower.startsWith('data:') ||
      lower.startsWith('blob:') ||
      lower.startsWith('file://') ||
      lower.startsWith('onyx-local://')
    ) {
      return trimmed;
    }
    return undefined;
  };

  const categorizeFetchedImages = (images: any[]) => {
    const categorized = emptyResults();
    const seenUrls = new Set<string>();

    images.forEach((img: any) => {
      const normalizedUrl = normalizeImageUrl(
        img.url || img.boxArtUrl || img.coverUrl || img.bannerUrl || img.logoUrl || img.iconUrl || img.screenshotUrls?.[0],
      );
      if (!normalizedUrl) return;

      const normalizedType: ImageType | undefined = img.type === 'hero' || img.type === 'screenshot'
        ? 'banner'
        : img.type === 'alternativeBanner'
          ? 'alternativeBanner'
          : img.type;
      const dedupeKey = `${normalizedUrl}|${img.source || ''}|${normalizedType || ''}`;
      if (seenUrls.has(dedupeKey)) return;
      seenUrls.add(dedupeKey);

      const normalizedResult = {
        ...img,
        url: normalizedUrl,
        boxArtUrl: normalizedType === 'boxart' ? normalizedUrl : img.boxArtUrl,
        coverUrl: normalizedType === 'boxart' ? normalizedUrl : img.coverUrl,
        bannerUrl: normalizedType === 'banner' || normalizedType === 'alternativeBanner' ? normalizedUrl : img.bannerUrl,
        logoUrl: normalizedType === 'logo' ? normalizedUrl : img.logoUrl,
        iconUrl: normalizedType === 'icon' ? normalizedUrl : img.iconUrl,
        source: img.source || 'Unknown',
      };

      if (normalizedType === 'alternativeBanner') {
        categorized.alternativeBanner.push(normalizedResult);
      } else if (normalizedType === 'boxart' || normalizedType === 'banner' || normalizedType === 'logo' || normalizedType === 'icon') {
        categorized[normalizedType].push(normalizedResult);
      }
    });

    return categorized;
  };

  const openImageSearch = async (type: ImageType, explicitQuery?: string) => {
    const query = (explicitQuery || imageSearchQuery || editedFields.title).trim();
    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    const runId = ++imageSearchRunIdRef.current;
    const steamAppId = getNumericSteamAppId();

    setActiveTab('images');
    setActiveImageSearchTab(type);
    setImageSearchQuery(query);
    setIsSearchingImages(true);
    setError(null);
    clearImageResults();

    try {
      const response = await (window.electronAPI as any).fetchGameImages(
        query,
        steamAppId,
        undefined,
        false,
        runId,
        isStaged ? (game as StagedGame).uuid : (game as Game).id,
      );

      if (response?.success && Array.isArray(response.images)) {
        setSteamGridDBResults(categorizeFetchedImages(response.images));
      } else {
        setError(response?.error || 'No images found');
      }
    } catch (error) {
      console.error('[ImporterImageSearch] error', { runId, query, error });
      setError('Failed to fetch images from sources');
    } finally {
      setIsSearchingImages(false);
    }
  };

  const handleSearchImages = async (type: ImageType) => {
    await openImageSearch(type);
  };

  const applyImage = (type: ImageType, url: string) => {
    setEditedFields((prev) => {
      const next = { ...prev };

      if (type === 'boxart') {
        next.boxArtUrl = url;
      } else if (type === 'banner') {
        next.bannerUrl = url;
        next.heroUrl = url;
      } else if (type === 'alternativeBanner') {
        next.alternativeBannerUrl = url;
        next.useAlternativeBackground = true;
      } else if (type === 'logo') {
        next.logoUrl = url;
      } else if (type === 'icon') {
        next.iconUrl = url;
      }

      return next;
    });
    setSuccess(`Applied ${type === 'alternativeBanner' ? 'Alt Banner' : type}`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleBrowseImage = async (type: ImageType) => {
    try {
      const imagePath = await (window.electronAPI as any).showImageOrWebmDialog?.();
      if (!imagePath) return;
      if (/\.(webp)$/i.test(imagePath)) {
        setError('WebP files are not supported. Please choose another image format or a WEBM file.');
        return;
      }

      const gameId = isStaged ? (game as StagedGame).uuid : (game as Game).id;
      const cacheResult = await window.electronAPI.cacheLocalFile(imagePath, gameId, type);
      if (!cacheResult?.url) {
        setError(cacheResult?.error || 'Failed to add file to cache');
        return;
      }

      applyImage(type, cacheResult.url);
    } catch (error) {
      console.error('[ImporterImageBrowse] error', error);
      setError('Failed to select image file');
    }
  };

  const handleSelectFastGame = async (gameResult: any) => {
    console.log('[ImporterFastSearch] select result', {
      resultId: gameResult.id,
      resultName: gameResult.name,
      resultSource: gameResult.source,
      gameId: (game as any).id,
      showAnimatedImages: false,
      timestamp: new Date().toISOString(),
    });

    setFastSearchResults([]);
    setIsSearchingImages(true);
    setError(null);

    try {
      const steamAppId = getNumericSteamAppId();
      const igdbIdParam = (() => {
        if (gameResult.source !== 'igdb') return undefined;
        if (typeof gameResult.id === 'number' && Number.isFinite(gameResult.id)) return gameResult.id;
        if (typeof gameResult.id === 'string' && gameResult.id.startsWith('igdb-')) {
          const parsed = Number(gameResult.id.replace('igdb-', ''));
          return Number.isFinite(parsed) ? parsed : undefined;
        }
        return undefined;
      })();

      const response = await (window.electronAPI as any).fetchGameImages(
        gameResult.name,
        steamAppId,
        igdbIdParam,
        false,
        fastSearchActiveRunIdRef.current,
      );

      if (response.success && response.images) {
        setSteamGridDBResults(categorizeFetchedImages(response.images));
        setSuccess(`Showing images for "${gameResult.name}"`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to fetch images');
      }
    } catch (error) {
      console.error('Error fetching game images:', error);
      setError('Failed to fetch images from sources');
    } finally {
      setIsSearchingImages(false);
    }
  };

  const handleFastSearch = async () => {
    const query = imageSearchQuery || editedFields.title;
    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    const runId = ++fastSearchRunIdRef.current;
    fastSearchActiveRunIdRef.current = runId;
    setIsFastSearching(true);
    setError(null);
    setFastSearchResults([]);

    const removeProgressListener = window.electronAPI?.on
      ? window.electronAPI.on('metadata:fastSearchProgress', (_event: any, data: any) => {
        const results = Array.isArray(data) ? data : (data.results || []);
        const responseRequestId = Array.isArray(data) ? undefined : data.requestId;

        if (responseRequestId && responseRequestId !== fastSearchActiveRunIdRef.current) {
          console.log('[ImporterFastSearch] discard progress (requestId mismatch)', {
            runId,
            responseRequestId,
            expectedRequestId: fastSearchActiveRunIdRef.current,
          });
          return;
        }

        console.log('[ImporterFastSearch] progress', {
          runId,
          query,
          resultsCount: results.length,
          timestamp: new Date().toISOString(),
        });
        setFastSearchResults((prev) => {
          const currentIds = new Set(prev.map((result) => `${result.source}:${result.id}`));
          const newItems = results.filter((result: any) => !currentIds.has(`${result.source}:${result.id}`));
          return [...prev, ...newItems];
        });
      })
      : () => {};

    try {
      console.log(`[FastSearch] Searching for "${query}"...`);
      const startTime = Date.now();

      const response = await (window.electronAPI as any).fastImageSearch(query, runId);

      console.log(`[FastSearch] Completed in ${Date.now() - startTime}ms`);

      if (response && (response.boxArtUrl || response.bannerUrl || response.logoUrl || response.heroUrl)) {
        const syntheticResult = {
          id: Date.now(),
          name: query,
          coverUrl: response.boxArtUrl || '',
          bannerUrl: response.bannerUrl || response.heroUrl || '',
          logoUrl: response.logoUrl || '',
          screenshotUrls: response.screenshots || [],
          source: 'Best Match',
        };

        setFastSearchResults((prev) => (prev.length === 0 ? [syntheticResult] : prev));
        void handleSelectFastGame(syntheticResult);
        setSuccess(`Found metadata in ${Date.now() - startTime}ms`);
        setTimeout(() => setSuccess(null), 3000);
      } else if (response.success && response.games && response.games.length > 0) {
        setFastSearchResults(response.games);
        setSuccess(`Found ${response.games.length} game(s) in ${Date.now() - startTime}ms`);
        setTimeout(() => setSuccess(null), 3000);
      } else if (response.error) {
        setError(response.error);
      } else {
        setError(`No results found for "${query}". Try a different search term.`);
      }
    } catch (error) {
      setError('Failed to search. Check your internet connection and API credentials.');
      console.error('[ImporterFastSearch] error', { runId, query, error });
    } finally {
      if (typeof removeProgressListener === 'function') {
        removeProgressListener();
      }
      setIsFastSearching(false);
      console.log('[ImporterFastSearch] end', { runId, query, timestamp: new Date().toISOString() });
    }
  };

  return {
    activeImageSearchTab,
    applyImage,
    clearImageResults,
    failedImageUrls,
    fastSearchResults,
    handleBrowseImage,
    handleFastSearch,
    handleSearchImages,
    handleSelectFastGame,
    imageSearchQuery,
    isFastSearching,
    isSearchingImages,
    openImageSearch,
    resetImageState,
    setActiveImageSearchTab,
    setFailedImageUrls,
    setFastSearchResults,
    setImageSearchQuery,
    steamGridDBResults,
  };
};
