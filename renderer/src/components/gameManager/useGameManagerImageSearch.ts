import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import type { Game } from '../../types/game';
import {
  isWebmAssetUrl,
  matchesAnimationFilter,
  normalizeImageUrl,
  normalizeProviderName,
  type ProviderName,
} from './imageSearchUtils';
import {
  buildOrderedResultsByType,
  getImageCountForProvider,
  getImageResultCountForTab,
  hasAnyRawImageResults,
  hasAnyVisibleImageResults,
  matchesProviderFilter,
} from './imageResultUtils';
import {
  buildProviderProgress,
  markAllProvidersCompleted,
  markProviderCompleted,
  updateProviderProgressFromEvent,
  type ProviderProgressEntry,
} from './providerProgressUtils';

type ImageType = 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon';
type EffectiveImageType = 'boxart' | 'banner' | 'logo' | 'icon';
type ImageSearchTab = 'all' | ImageType;

interface FastSearchGame {
  id: number;
  name: string;
  coverUrl: string;
  bannerUrl: string;
  logoUrl: string;
  screenshotUrls: string[];
  steamAppId?: string;
  releaseDate?: number;
  source: string;
}

interface UseGameManagerImageSearchArgs {
  selectedGameId: string | null;
  selectedGame: Game | null;
  editedGame: Game | null;
  onSaveGame: (game: Game, oldGame?: Game) => Promise<void>;
  setEditedGame: React.Dispatch<React.SetStateAction<Game | null>>;
  setLocalGames: React.Dispatch<React.SetStateAction<Game[]>>;
  setActiveTab: React.Dispatch<React.SetStateAction<'images' | 'metadata' | 'links' | 'modManager'>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setSuccess: React.Dispatch<React.SetStateAction<string | null>>;
  imageChangedGameIdsRef: React.MutableRefObject<Set<string>>;
}

const EMPTY_TYPE_RESULTS = {
  boxart: [],
  banner: [],
  alternativeBanner: [],
  logo: [],
  icon: [],
} as { boxart: any[]; banner: any[]; alternativeBanner: any[]; logo: any[]; icon: any[] };

export function useGameManagerImageSearch({
  selectedGameId,
  selectedGame,
  editedGame,
  onSaveGame,
  setEditedGame,
  setLocalGames,
  setActiveTab,
  setError,
  setSuccess,
  imageChangedGameIdsRef,
}: UseGameManagerImageSearchArgs) {
  const [showImageSearch, setShowImageSearch] = useState<{ type: ImageType; gameId: string } | null>(null);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [imageSearchResults, setImageSearchResults] = useState<any[]>([]);
  const [failedImageSearchUrls, setFailedImageSearchUrls] = useState<Set<string>>(new Set());
  const [steamGridDBResults, setSteamGridDBResults] = useState<{ boxart: any[]; banner: any[]; alternativeBanner: any[]; logo: any[]; icon: any[] }>(EMPTY_TYPE_RESULTS);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [activeImageSearchTab, setActiveImageSearchTab] = useState<ImageSearchTab>('all');
  const [isFastSearching, setIsFastSearching] = useState(false);
  const [fastSearchResults, setFastSearchResults] = useState<FastSearchGame[]>([]);
  const [selectedFastGame, setSelectedFastGame] = useState<FastSearchGame | null>(null);
  const [providerFilter, setProviderFilter] = useState<'all' | ProviderName>('all');
  const [providerAvailability, setProviderAvailability] = useState<Partial<Record<ProviderName, boolean>>>({});
  const [providerProgress, setProviderProgress] = useState<ProviderProgressEntry[]>([]);

  const selectedGameIdRef = useRef(selectedGameId);
  const currentSearchQueryRef = useRef(imageSearchQuery);
  const fastSearchRunIdRef = useRef(0);
  const imageSearchRunIdRef = useRef(0);
  const fastSearchActiveRunIdRef = useRef(0);
  const imageResultOrderRef = useRef(0);
  const includeAnimatedInRequests = false;

  const nextImageResultOrder = () => {
    imageResultOrderRef.current += 1;
    return imageResultOrderRef.current;
  };

  const getRenderableImageUrl = useCallback((value?: string) => {
    const normalized = normalizeImageUrl(value);
    if (!normalized) return undefined;
    if (failedImageSearchUrls.has(normalized)) return undefined;
    return normalized;
  }, [failedImageSearchUrls]);

  const markImageResultUrlAsFailed = useCallback((value?: string) => {
    const normalized = normalizeImageUrl(value);
    if (!normalized) return;
    setFailedImageSearchUrls(prev => {
      if (prev.has(normalized)) return prev;
      const next = new Set(prev);
      next.add(normalized);
      return next;
    });
  }, []);

  const handleImageResultLoadError = useCallback((url: string | undefined, event: React.SyntheticEvent<HTMLImageElement>) => {
    markImageResultUrlAsFailed(url);
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
    target.parentElement?.parentElement?.remove();
  }, [markImageResultUrlAsFailed]);

  const resetImageWorkflow = useCallback(() => {
    setShowImageSearch(null);
    setImageSearchQuery('');
    setImageSearchResults([]);
    setFailedImageSearchUrls(new Set());
    setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
    setIsSearchingImages(false);
    setActiveImageSearchTab('all');
    setIsFastSearching(false);
    setFastSearchResults([]);
    setSelectedFastGame(null);
    setProviderProgress([]);
    setProviderFilter('all');
    fastSearchActiveRunIdRef.current = ++fastSearchRunIdRef.current;
    imageSearchRunIdRef.current += 1;
  }, []);

  useEffect(() => {
    selectedGameIdRef.current = selectedGameId;
  }, [selectedGameId]);

  useEffect(() => {
    currentSearchQueryRef.current = imageSearchQuery;
  }, [imageSearchQuery]);

  useEffect(() => {
    let cancelled = false;

    const loadProviderAvailability = async () => {
      try {
        const statusResult = await window.electronAPI.getMetadataProviderStatus?.();
        if (!statusResult || !statusResult.success || cancelled) return;

        const availability: Partial<Record<ProviderName, boolean>> = {};
        for (const provider of statusResult.providers) {
          const normalized = normalizeProviderName(provider.name);
          if (normalized === 'SteamGridDB' || normalized === 'IGDB' || normalized === 'RAWG' || normalized === 'Giant Bomb') {
            availability[normalized] = provider.available;
          }
        }

        availability['Steam Store API'] = true;
        availability['Web Search'] = true;
        setProviderAvailability(availability);
      } catch (err) {
        console.warn('[GameManager] Failed to load metadata provider status', err);
      }
    };

    void loadProviderAvailability();

    return () => {
      cancelled = true;
    };
  }, []);

  const orderedResultsByType = useMemo(() => (
    buildOrderedResultsByType(imageSearchResults, steamGridDBResults, getRenderableImageUrl)
  ), [getRenderableImageUrl, imageSearchResults, steamGridDBResults]);

  const getVisibleImageResultCountForTab = useCallback((tab: ImageType) => (
    getImageResultCountForTab(orderedResultsByType, providerFilter, tab)
  ), [orderedResultsByType, providerFilter]);

  const matchesActiveProviderFilter = useCallback((source?: string) => (
    matchesProviderFilter(source, providerFilter)
  ), [providerFilter]);

  const handleClearImageSearchState = useCallback(() => {
    setImageSearchResults([]);
    setFailedImageSearchUrls(new Set());
    setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
    setFastSearchResults([]);
    setSelectedFastGame(null);
  }, []);

  const handleOpenGoogleImageSearch = useCallback((query: string) => {
    window.electronAPI.openExternal(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`);
  }, []);

  const handleSearchImages = useCallback(async (
    imageType: ImageType,
    useWeb: boolean = false,
    prefetchRemainingTypes: boolean = true,
    explicitQuery?: string
  ) => {
    if (!selectedGame) return;

    const runId = ++imageSearchRunIdRef.current;
    const effectiveImageType: EffectiveImageType = imageType === 'alternativeBanner' ? 'banner' : imageType;

    const getSteamAppId = (): string | undefined => {
      if (editedGame) {
        const appIdMatch = editedGame.id.match(/^steam-(.+)$/);
        if (appIdMatch) return appIdMatch[1];
      }
      const appIdMatch = selectedGame.id.match(/^steam-(.+)$/);
      return appIdMatch ? appIdMatch[1] : undefined;
    };

    const steamAppId = getSteamAppId();
    const query = explicitQuery?.trim() || imageSearchQuery.trim() || selectedGame.title.trim();

    const prefetchOtherImageTypes = async (baseImageType: EffectiveImageType, searchQuery: string, appId?: string) => {
      const allTypes: EffectiveImageType[] = ['boxart', 'banner', 'logo', 'icon'];
      const remainingTypes = allTypes.filter(type => type !== baseImageType);

      const prefetchPromises = remainingTypes.map(async (type) => {
        try {
          const sgdbResponse: any = await window.electronAPI.searchImages(searchQuery, type, appId, includeAnimatedInRequests);
          if (selectedGameIdRef.current !== selectedGame.id || currentSearchQueryRef.current !== searchQuery) return;
          if (!sgdbResponse?.success || !sgdbResponse.images) return;

          const flattenedResults: any[] = [];
          sgdbResponse.images.forEach((gameResult: any) => {
            gameResult.images.forEach((img: any) => {
              if (!matchesAnimationFilter(img.url, img)) return;
              const isOfficialSteam = img.score >= 1000 || gameResult.gameName?.includes('Official Steam');
              flattenedResults.push({
                id: gameResult.gameId,
                name: gameResult.gameName,
                title: gameResult.gameName,
                boxArtUrl: type === 'boxart' ? img.url : undefined,
                bannerUrl: type === 'banner' ? img.url : undefined,
                logoUrl: type === 'logo' ? img.url : undefined,
                iconUrl: type === 'icon' ? img.url : undefined,
                coverUrl: type === 'boxart' ? img.url : undefined,
                source: isOfficialSteam ? 'steam' : 'steamgriddb',
                score: img.score,
                width: img.width,
                height: img.height,
                mime: img.mime,
                isAnimated: img.isAnimated ?? img.animated ?? img.is_animated,
                notes: img.notes,
                foundOrder: nextImageResultOrder(),
              });
            });
          });

          if (flattenedResults.length > 0) {
            setSteamGridDBResults(prev => ({
              ...prev,
              [type]: [...prev[type], ...flattenedResults],
            }));
          }
        } catch (err) {
          console.warn('[ImageSearch] prefetch type failed', { type, searchQuery, err });
        }
      });

      await Promise.allSettled(prefetchPromises);
    };

    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setIsSearchingImages(true);
    setError(null);

    const orderedProviders: ProviderName[] = ['Steam Store API', 'SteamGridDB', 'IGDB', 'RAWG', 'Giant Bomb', 'Web Search'];
    setProviderProgress(buildProviderProgress(orderedProviders, providerAvailability, {
      useWeb,
      steamAppId,
      effectiveImageType,
    }));

    const setProviderCompleted = (name: ProviderName) => {
      setProviderProgress(prev => markProviderCompleted(prev, name));
    };

    if (!steamAppId && !useWeb) {
      setImageSearchResults([]);
      setFailedImageSearchUrls(new Set());
      setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
    } else if (useWeb) {
      setImageSearchResults([]);
      setFailedImageSearchUrls(new Set());
    }

    let activeSearches = 0;
    const checkFinished = () => {
      activeSearches -= 1;
      if (activeSearches <= 0) {
        setIsSearchingImages(false);
      }
    };

    if (steamAppId && !useWeb) {
      activeSearches += 1;
      window.electronAPI.searchArtwork(selectedGame.title, steamAppId)
        .then((steamMetadata) => {
          if (selectedGameIdRef.current !== selectedGame.id || currentSearchQueryRef.current !== query) return;
          if (!steamMetadata) return;

          const steamResults: any[] = [];
          const addResult = (url: string | undefined, type: ImageType) => {
            const normalizedUrl = normalizeImageUrl(url);
            if (!normalizedUrl) return;
            steamResults.push({
              id: `steam-${steamAppId}`,
              name: selectedGame.title,
              title: selectedGame.title,
              [type === 'boxart' ? 'boxArtUrl' : type === 'logo' ? 'logoUrl' : type === 'icon' ? 'iconUrl' : type === 'alternativeBanner' ? 'alternativeBannerUrl' : 'bannerUrl']: normalizedUrl,
              source: 'steam',
              score: 10000,
              foundOrder: nextImageResultOrder(),
            });
          };

          if (effectiveImageType === 'boxart') addResult(steamMetadata.boxArtUrl, 'boxart');
          else if (effectiveImageType === 'banner') addResult(steamMetadata.bannerUrl, 'banner');
          else if (effectiveImageType === 'logo') addResult(steamMetadata.logoUrl, 'logo');
          else if (effectiveImageType === 'icon') addResult(steamMetadata.iconUrl, 'icon');

          if (steamResults.length > 0) {
            setSteamGridDBResults(prev => ({
              ...prev,
              [effectiveImageType]: [...prev[effectiveImageType], ...steamResults],
            }));
          }
        })
        .catch(err => console.error('[ImageSearch] Steam artwork error', { runId, query, err }))
        .finally(() => {
          setProviderCompleted('Steam Store API');
          checkFinished();
        });
    }

    try {
      if (useWeb) {
        activeSearches += 1;
        void window.electronAPI.searchWebImages(query, effectiveImageType as any)
          .then((response: any) => {
            if (selectedGameIdRef.current !== selectedGame.id || currentSearchQueryRef.current !== query) return;
            if (!response.success || !response.images) return;

            const flattenedResults: any[] = [];
            response.images.forEach((gameResult: any) => {
              gameResult.images.forEach((img: any) => {
                const normalizedUrl = normalizeImageUrl(img.url);
                if (!normalizedUrl || !matchesAnimationFilter(normalizedUrl, img)) return;
                flattenedResults.push({
                  id: `${gameResult.gameId}-${normalizedUrl}`,
                  name: gameResult.gameName,
                  title: gameResult.gameName,
                  boxArtUrl: effectiveImageType === 'boxart' ? normalizedUrl : undefined,
                  bannerUrl: effectiveImageType === 'banner' ? normalizedUrl : undefined,
                  logoUrl: effectiveImageType === 'logo' ? normalizedUrl : undefined,
                  iconUrl: effectiveImageType === 'icon' ? normalizedUrl : undefined,
                  coverUrl: effectiveImageType === 'boxart' ? normalizedUrl : undefined,
                  source: img.source || 'web',
                  score: img.score,
                  width: img.width,
                  height: img.height,
                  mime: img.mime,
                  isAnimated: img.isAnimated ?? img.animated ?? img.is_animated,
                  notes: img.notes,
                  foundOrder: nextImageResultOrder(),
                });
              });
            });

            if (effectiveImageType === 'boxart') {
              setSteamGridDBResults(prev => ({ ...prev, boxart: [...prev.boxart, ...flattenedResults] }));
            } else if (effectiveImageType === 'banner') {
              setSteamGridDBResults(prev => ({ ...prev, banner: [...prev.banner, ...flattenedResults] }));
            } else if (effectiveImageType === 'logo') {
              setSteamGridDBResults(prev => ({ ...prev, logo: [...prev.logo, ...flattenedResults] }));
            } else if (effectiveImageType === 'icon') {
              setSteamGridDBResults(prev => ({ ...prev, icon: [...prev.icon, ...flattenedResults] }));
            }
          })
          .catch((err: any) => {
            console.error('[ImageSearch] Web search error', { runId, query, err });
          })
          .finally(() => {
            setProviderCompleted('Web Search');
            checkFinished();
          });
      } else {
        if (effectiveImageType === 'boxart' || effectiveImageType === 'banner') {
          activeSearches += 1;
          void window.electronAPI.searchMetadata(query)
            .then((igdbResponse: any) => {
              if (selectedGameIdRef.current !== selectedGame.id || currentSearchQueryRef.current !== query) return;
              if (!igdbResponse?.success || !igdbResponse.results?.length) return;

              const filteredIGDBResults = igdbResponse.results.filter((result: any) => (
                effectiveImageType === 'boxart' ? result.coverUrl : result.screenshotUrls && result.screenshotUrls.length > 0
              ));

              if (filteredIGDBResults.length > 0) {
                const withSource = filteredIGDBResults.map((result: any) => ({
                  ...result,
                  source: result.source || 'IGDB',
                  foundOrder: nextImageResultOrder(),
                }));
                setImageSearchResults(prev => [...prev, ...withSource]);
              }
            })
            .catch((err: any) => {
              console.error('[ImageSearch] IGDB search error', { runId, query, err });
            })
            .finally(() => {
              setProviderCompleted('IGDB');
              checkFinished();
            });
        }

        activeSearches += 1;
        void window.electronAPI.searchImages(query, effectiveImageType as any, steamAppId, includeAnimatedInRequests)
          .then((sgdbResponse: any) => {
            if (selectedGameIdRef.current !== selectedGame.id || currentSearchQueryRef.current !== query) return;
            if (!sgdbResponse.success || !sgdbResponse.images) return;

            const flattenedResults: any[] = [];
            sgdbResponse.images.forEach((gameResult: any) => {
              gameResult.images.forEach((img: any) => {
                const normalizedUrl = normalizeImageUrl(img.url);
                if (!normalizedUrl || !matchesAnimationFilter(normalizedUrl, img)) return;
                const isOfficialSteam = img.score >= 1000 || gameResult.gameName?.includes('Official Steam');
                flattenedResults.push({
                  id: `${gameResult.gameId}-${normalizedUrl}`,
                  name: gameResult.gameName,
                  title: gameResult.gameName,
                  boxArtUrl: effectiveImageType === 'boxart' ? normalizedUrl : undefined,
                  bannerUrl: effectiveImageType === 'banner' ? normalizedUrl : undefined,
                  logoUrl: effectiveImageType === 'logo' ? normalizedUrl : undefined,
                  coverUrl: effectiveImageType === 'boxart' ? normalizedUrl : undefined,
                  source: isOfficialSteam ? 'steam' : 'steamgriddb',
                  score: img.score,
                  width: img.width,
                  height: img.height,
                  mime: img.mime,
                  isAnimated: img.isAnimated ?? img.animated ?? img.is_animated,
                  notes: img.notes,
                  foundOrder: nextImageResultOrder(),
                });
              });
            });

            if (flattenedResults.length > 0) {
              setSteamGridDBResults(prev => ({
                ...prev,
                [effectiveImageType]: [...prev[effectiveImageType], ...flattenedResults],
              }));
            }
          })
          .catch((err: any) => {
            console.error('[ImageSearch] SteamGridDB search error', { runId, query, err });
          })
          .finally(() => {
            setProviderCompleted('SteamGridDB');
            checkFinished();
          });
      }

      if (activeSearches === 0) {
        setIsSearchingImages(false);
      }

      if (!useWeb && prefetchRemainingTypes) {
        void prefetchOtherImageTypes(effectiveImageType, query, steamAppId);
      }
    } catch (err) {
      setError(`Failed to search for ${imageType}`);
      console.error(`Error searching ${imageType}:`, err);
    }
  }, [editedGame, imageSearchQuery, includeAnimatedInRequests, providerAvailability, selectedGame, setError]);

  const handleImageSearchTabChange = useCallback((tab: ImageSearchTab) => {
    setActiveImageSearchTab(tab);

    if (tab === 'all' || !selectedGame) return;

    setShowImageSearch({ type: tab, gameId: selectedGame.id });

    if (isSearchingImages) return;

    if (getImageResultCountForTab(orderedResultsByType, providerFilter, tab) === 0) {
      void handleSearchImages(tab);
    }
  }, [handleSearchImages, isSearchingImages, orderedResultsByType, providerFilter, selectedGame]);

  const openImageSearchAndSearch = useCallback((type: ImageType) => {
    if (!selectedGame) return;

    setShowImageSearch({ type, gameId: selectedGame.id });
    setActiveImageSearchTab(type);
    if (hasAnyRawImageResults(imageSearchResults, steamGridDBResults)) {
      return;
    }

    setImageSearchQuery(selectedGame.title);
    currentSearchQueryRef.current = selectedGame.title;

    const runId = ++fastSearchRunIdRef.current;
    fastSearchActiveRunIdRef.current = runId;

    const steamAppId = (selectedGame.id.match(/^steam-(.+)$/) || [])[1] ?? (editedGame?.id.match(/^steam-(.+)$/) || [])[1];
    const orderedProviders: ProviderName[] = ['Steam Store API', 'SteamGridDB', 'IGDB', 'RAWG', 'Giant Bomb'];
    setProviderProgress(buildProviderProgress(orderedProviders, providerAvailability, {
      steamAppId,
      markAllSearchable: true,
    }));

    setImageSearchResults([]);
    setFailedImageSearchUrls(new Set());
    setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
    setError(null);
    setIsSearchingImages(true);

    (window.electronAPI as any)
      .fetchGameImages(selectedGame.title, steamAppId, undefined, includeAnimatedInRequests, runId, selectedGame.id)
      .then(() => {
        if (fastSearchActiveRunIdRef.current === runId) {
          setIsSearchingImages(false);
          setProviderProgress(prev => markAllProvidersCompleted(prev));
        }
      })
      .catch((err: unknown) => {
        console.warn('[ImageSearch] fetchGameImages error', err);
        if (fastSearchActiveRunIdRef.current === runId) {
          setIsSearchingImages(false);
          setError(err instanceof Error ? err.message : 'Image search failed');
        }
      });
  }, [editedGame, imageSearchResults, includeAnimatedInRequests, providerAvailability, selectedGame, setError, steamGridDBResults]);

  const handleSelectFastGame = useCallback(async (gameResult: FastSearchGame) => {
    if (!selectedGame) return;

    setSelectedFastGame(gameResult);
    setFastSearchResults([]);
    setIsSearchingImages(true);
    setError(null);
    setImageSearchQuery(gameResult.name);

    setImageSearchResults([]);
    setFailedImageSearchUrls(new Set());
    setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });

    if (!showImageSearch) {
      setShowImageSearch({ type: 'boxart', gameId: selectedGame.id });
    }

    if (showImageSearch?.type) {
      setActiveImageSearchTab(showImageSearch.type);
    } else {
      setActiveImageSearchTab('all');
    }

    try {
      const igdbIdParam = (() => {
        if (gameResult.source !== 'igdb') return undefined;
        if (typeof gameResult.id === 'number' && Number.isFinite(gameResult.id)) return gameResult.id;
        const rawId = String(gameResult.id || '');
        if (rawId.startsWith('igdb-')) {
          const parsed = Number(rawId.replace('igdb-', ''));
          return Number.isFinite(parsed) ? parsed : undefined;
        }
        return undefined;
      })();

      const response = await (window.electronAPI as any).fetchGameImages(
        gameResult.name,
        selectedGame.id.startsWith('steam-') ? selectedGame.id.replace('steam-', '') : undefined,
        igdbIdParam,
        includeAnimatedInRequests,
        fastSearchActiveRunIdRef.current,
        selectedGame.id
      );

      if (selectedGameIdRef.current !== selectedGame.id) {
        return;
      }

      if (response.success && response.images && response.images.length > 0) {
        setSuccess(`Found ${response.images.length} images for "${gameResult.name}"`);
      } else if (response.error) {
        setError(response.error);
      } else if (steamGridDBResults.boxart.length === 0 && imageSearchResults.length === 0) {
        setError('No images found');
      }
    } catch (err) {
      setError('Failed to fetch images');
      console.error('[FastSearch] fetch images error', { err, resultId: gameResult.id, resultName: gameResult.name });
    } finally {
      setIsSearchingImages(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  }, [imageSearchResults.length, includeAnimatedInRequests, selectedGame, setError, setSuccess, showImageSearch, steamGridDBResults.boxart.length]);

  const handleFastSearch = useCallback(async () => {
    if (!selectedGame) return;

    const runId = ++fastSearchRunIdRef.current;
    fastSearchActiveRunIdRef.current = runId;

    const query = imageSearchQuery.trim() || selectedGame.title.trim();
    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setImageSearchQuery(query);
    currentSearchQueryRef.current = query;

    setIsFastSearching(true);
    setError(null);
    setFastSearchResults([]);
    setSelectedFastGame(null);

    const removeProgressListener = window.electronAPI?.on
      ? window.electronAPI.on('metadata:fastSearchProgress', (_event: any, data: any) => {
        const results = Array.isArray(data) ? data : (data.results || []);
        const responseQuery = Array.isArray(data) ? null : data.query;
        const responseRequestId = Array.isArray(data) ? undefined : data.requestId;

        if (responseRequestId && responseRequestId !== fastSearchActiveRunIdRef.current) return;
        if (responseQuery && responseQuery !== query) return;
        if (selectedGameIdRef.current !== selectedGame.id) return;

        setFastSearchResults(prev => {
          const currentIds = new Set(prev.map(item => `${item.source}:${item.id}`));
          const newItems = results.filter((result: any) => !currentIds.has(`${result.source}:${result.id}`));
          return [...prev, ...newItems];
        });
      })
      : () => {};

    try {
      const startTime = Date.now();
      const response = await (window.electronAPI as any).fastImageSearch(query, runId);

      if (response && (response.boxArtUrl || response.bannerUrl || response.logoUrl || response.heroUrl)) {
        const syntheticResult: FastSearchGame = {
          id: Date.now(),
          name: query,
          coverUrl: response.boxArtUrl || '',
          bannerUrl: response.bannerUrl || response.heroUrl || '',
          logoUrl: response.logoUrl || '',
          screenshotUrls: response.screenshots || [],
          source: 'Best Match',
        };

        setFastSearchResults(prev => (prev.length === 0 ? [syntheticResult] : prev));
        if (!selectedFastGame) {
          void handleSelectFastGame(syntheticResult);
        }

        setSuccess(`Found metadata in ${Date.now() - startTime}ms`);
        setTimeout(() => setSuccess(null), 3000);
      } else if (response.success && response.games && response.games.length > 0) {
        setFastSearchResults(response.games);
        setSuccess(`Found ${response.games.length} game(s) in ${Date.now() - startTime}ms`);
        setTimeout(() => setSuccess(null), 3000);
      } else if (response.error) {
        setFastSearchResults(prev => {
          if (prev.length === 0) setError(response.error);
          return prev;
        });
      } else {
        setFastSearchResults(prev => {
          if (prev.length === 0) setError(`No results found for "${query}". Try a different search term or check the spelling.`);
          return prev;
        });
      }
    } catch (err) {
      setError('Failed to search. Check your internet connection and API credentials.');
      console.error('[FastSearch] Error:', { runId, query, err });
    } finally {
      if (typeof removeProgressListener === 'function') {
        removeProgressListener();
      }
      setIsFastSearching(false);
    }
  }, [handleSelectFastGame, imageSearchQuery, selectedFastGame, selectedGame, setError, setSuccess]);

  useEffect(() => {
    const handleImagesFound = (_event: any, data: any) => {
      if (!data || !data.images || data.images.length === 0) return;
      if (data.requestId && data.requestId !== fastSearchActiveRunIdRef.current) return;
      if (data.query && data.query !== currentSearchQueryRef.current) return;
      if (data.gameId && data.gameId !== selectedGameIdRef.current) return;

      const newImages: any[] = [];
      const seenUrls = new Set<string>();

      data.images.forEach((img: any) => {
        const normalizedUrl = normalizeImageUrl(img.url);
        if (!normalizedUrl || !matchesAnimationFilter(normalizedUrl, img)) return;
        const dedupeKey = `${normalizedUrl}|${img.source}|${img.type}`;
        if (seenUrls.has(dedupeKey)) return;
        seenUrls.add(dedupeKey);

        const imageObj: any = {
          id: `${img.source}-${img.type}-${Math.random().toString(36).substr(2, 9)}`,
          name: img.name || img.source,
          source: img.source,
          url: normalizedUrl,
          mime: img.mime,
          isAnimated: img.isAnimated ?? img.animated ?? img.is_animated,
          notes: img.notes,
          screenshotUrls: img.type === 'banner' || img.type === 'screenshot' ? [normalizedUrl] : undefined,
          foundOrder: nextImageResultOrder(),
        };

        if (img.type === 'boxart') {
          imageObj.boxArtUrl = normalizedUrl;
          imageObj.coverUrl = normalizedUrl;
        } else if (img.type === 'logo') {
          imageObj.logoUrl = normalizedUrl;
        } else if (img.type === 'icon') {
          imageObj.iconUrl = normalizedUrl;
        } else {
          imageObj.bannerUrl = normalizedUrl;
          imageObj.type = 'banner';
        }

        if (img.type === 'boxart' || img.type === 'banner' || img.type === 'screenshot' || img.type === 'hero' || img.type === 'logo' || img.type === 'icon') {
          newImages.push(imageObj);
        }
      });

      setImageSearchResults(prev => {
        const seen = new Set(prev.map((item: any) => {
          const url = normalizeImageUrl(item.url || item.boxArtUrl || item.coverUrl || item.bannerUrl || item.screenshotUrls?.[0] || item.logoUrl || item.iconUrl);
          const type = item.type || (item.boxArtUrl || item.coverUrl ? 'boxart' : item.logoUrl ? 'logo' : item.iconUrl ? 'icon' : 'banner');
          return `${url || ''}|${item.source || ''}|${type}`;
        }));
        const additions = newImages.filter((item: any) => {
          const url = normalizeImageUrl(item.url || item.boxArtUrl || item.coverUrl || item.bannerUrl || item.screenshotUrls?.[0] || item.logoUrl || item.iconUrl);
          const type = item.type || (item.boxArtUrl || item.coverUrl ? 'boxart' : item.logoUrl ? 'logo' : item.iconUrl ? 'icon' : 'banner');
          const key = `${url || ''}|${item.source || ''}|${type}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return [...prev, ...additions];
      });
    };

    const removeListener = window.electronAPI?.on && window.electronAPI.on('metadata:gameImagesFound', handleImagesFound);
    return () => {
      if (typeof removeListener === 'function') removeListener();
    };
  }, []);

  useEffect(() => {
    const handleProviderStatus = (_event: any, data: any) => {
      if (data.requestId !== undefined && data.requestId !== fastSearchActiveRunIdRef.current) {
        return;
      }
      if (data.currentProvider) {
        setProviderProgress(prev => updateProviderProgressFromEvent(prev, data.currentProvider, data.remaining || []));
      } else {
        setProviderProgress(prev => markAllProvidersCompleted(prev));
      }
    };

    const removeProviderListener = window.electronAPI?.on && window.electronAPI.on('metadata:imageSearchProviderStatus', handleProviderStatus);
    return () => {
      if (typeof removeProviderListener === 'function') removeProviderListener();
    };
  }, []);

  const handleSelectImage = useCallback(async (imageUrl: string, type: ImageType, isVideo?: boolean) => {
    if (!selectedGame || !editedGame) return;

    setActiveTab('images');

    if (/\.(webp)(\?|$)/i.test(imageUrl.toLowerCase())) {
      setError('WebP artwork is not supported. Please download the WEBM version from SteamGridDB (right-click the video > "Save video as...") and use "Upload WEBM" for this image type.');
      return;
    }

    if (!imageUrl.startsWith('onyx-local://')) {
      try {
        await window.electronAPI.deleteCachedImage(selectedGame.id, type as any);
      } catch (err) {
        console.warn('Error deleting old image:', err);
      }
    }

    const isV = isVideo === true || isWebmAssetUrl(imageUrl);
    const updatedGame = { ...editedGame };
    if (type === 'boxart') {
      updatedGame.boxArtUrl = imageUrl;
      updatedGame.boxArtIsVideo = isV;
      updatedGame.bannerUrl = editedGame.bannerUrl || selectedGame.bannerUrl || updatedGame.bannerUrl;
      updatedGame.logoUrl = editedGame.logoUrl || selectedGame.logoUrl || updatedGame.logoUrl;
    } else if (type === 'banner') {
      updatedGame.bannerUrl = imageUrl;
      updatedGame.heroUrl = imageUrl;
      updatedGame.bannerIsVideo = isV;
      updatedGame.heroIsVideo = isV;
      updatedGame.boxArtUrl = editedGame.boxArtUrl || selectedGame.boxArtUrl || updatedGame.boxArtUrl;
      updatedGame.logoUrl = editedGame.logoUrl || selectedGame.logoUrl || updatedGame.logoUrl;
    } else if (type === 'alternativeBanner') {
      updatedGame.alternativeBannerUrl = imageUrl;
      updatedGame.useAlternativeBackground = true;
      updatedGame.alternativeBannerIsVideo = isV;
      updatedGame.boxArtUrl = editedGame.boxArtUrl || selectedGame.boxArtUrl || updatedGame.boxArtUrl;
      updatedGame.bannerUrl = editedGame.bannerUrl || selectedGame.bannerUrl || updatedGame.bannerUrl;
      updatedGame.logoUrl = editedGame.logoUrl || selectedGame.logoUrl || updatedGame.logoUrl;
    } else if (type === 'logo') {
      updatedGame.logoUrl = imageUrl;
      updatedGame.logoIsVideo = isV;
      updatedGame.boxArtUrl = editedGame.boxArtUrl || selectedGame.boxArtUrl || updatedGame.boxArtUrl;
      updatedGame.bannerUrl = editedGame.bannerUrl || selectedGame.bannerUrl || updatedGame.bannerUrl;
      updatedGame.iconUrl = editedGame.iconUrl || selectedGame.iconUrl || updatedGame.iconUrl;
    } else if (type === 'icon') {
      updatedGame.iconUrl = imageUrl;
      updatedGame.iconIsVideo = isV;
      updatedGame.boxArtUrl = editedGame.boxArtUrl || selectedGame.boxArtUrl || updatedGame.boxArtUrl;
      updatedGame.bannerUrl = editedGame.bannerUrl || selectedGame.bannerUrl || updatedGame.bannerUrl;
      updatedGame.logoUrl = editedGame.logoUrl || selectedGame.logoUrl || updatedGame.logoUrl;
    }

    setEditedGame(updatedGame);
    setLocalGames(prevGames => prevGames.map(game => game.id === updatedGame.id ? updatedGame : game));
    imageChangedGameIdsRef.current.add(updatedGame.id);

    try {
      await onSaveGame(updatedGame, selectedGame);
    } catch (err) {
      setError('Failed to save image');
      console.error('Error saving image:', err);
      setLocalGames(prevGames => prevGames.map(game => game.id === selectedGame.id ? selectedGame : game));
      setEditedGame({ ...selectedGame });
    }
  }, [editedGame, imageChangedGameIdsRef, onSaveGame, selectedGame, setActiveTab, setEditedGame, setError, setLocalGames]);

  const handleBrowseImage = useCallback(async (type: ImageType) => {
    if (!selectedGame || !editedGame) return;

    try {
      const imagePath = await window.electronAPI.showImageDialog();
      if (!imagePath) return;
      if (/\.(webp)$/i.test(imagePath)) {
        setError('WebP files are not supported. Please save a WEBM video from SteamGridDB ("Save video as...") and select the .webm file instead.');
        return;
      }

      const cacheLocalFile = (window.electronAPI as any).cacheLocalFile;
      const result = cacheLocalFile
        ? await cacheLocalFile(imagePath, selectedGame.id, type)
        : { url: null, isVideo: false, error: 'Local cache API is unavailable in this build.' };

      if (!result?.url) {
        setError(result?.error || 'Failed to add file to cache. Try another image.');
        return;
      }

      await handleSelectImage(result.url, type, result.isVideo);
    } catch (err) {
      console.error('Error browsing for image:', err);
      setError('Failed to select image file');
    }
  }, [editedGame, handleSelectImage, selectedGame, setError]);

  return {
    showImageSearch,
    setShowImageSearch,
    imageSearchQuery,
    setImageSearchQuery,
    imageSearchResults,
    steamGridDBResults,
    isSearchingImages,
    isFastSearching,
    fastSearchResults,
    selectedFastGame,
    activeImageSearchTab,
    setActiveImageSearchTab,
    providerProgress,
    providerFilter,
    setProviderFilter,
    orderedResultsByType,
    resetImageWorkflow,
    getRenderableImageUrl,
    handleImageResultLoadError,
    handleClearImageSearchState,
    handleOpenGoogleImageSearch,
    handleImageSearchTabChange,
    handleSearchImages,
    openImageSearchAndSearch,
    handleFastSearch,
    handleSelectFastGame,
    handleSelectImage,
    handleBrowseImage,
    hasRawImageResults: hasAnyRawImageResults(imageSearchResults, steamGridDBResults),
    hasVisibleImageResults: hasAnyVisibleImageResults(orderedResultsByType, providerFilter),
    getImageCountForProvider: (providerName: string) => getImageCountForProvider(orderedResultsByType, providerName),
    getVisibleImageResultCountForTab,
    matchesActiveProviderFilter,
  };
}
