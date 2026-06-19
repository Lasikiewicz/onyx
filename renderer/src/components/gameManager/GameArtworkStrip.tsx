import { useCallback, useEffect, useState } from 'react';
import type { Game } from '../../types/game';

type ArtworkType = 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon';

interface ArtworkMenuEvent {
  pageX: number;
  pageY: number;
}

interface GameArtworkStripProps {
  editedGame: Game;
  selectedGame: Game;
  onOpenImageSearch: (type: ArtworkType) => void;
  onOpenContextMenu: (event: ArtworkMenuEvent, type: ArtworkType) => void;
}

export function GameArtworkStrip({
  editedGame,
  selectedGame,
  onOpenImageSearch,
  onOpenContextMenu,
}: GameArtworkStripProps) {
  const boxArtUrl = editedGame.boxArtUrl || selectedGame.boxArtUrl;
  const [brokenBoxArtUrl, setBrokenBoxArtUrl] = useState<string | null>(null);

  useEffect(() => {
    if (brokenBoxArtUrl && brokenBoxArtUrl !== boxArtUrl) {
      setBrokenBoxArtUrl(null);
    }
  }, [boxArtUrl, brokenBoxArtUrl]);

  const handleBrokenBoxArt = useCallback(() => {
    setBrokenBoxArtUrl(boxArtUrl || null);
  }, [boxArtUrl]);

  return (
    <div className="flex gap-2 mb-1 items-start">
      <div
        onClick={() => onOpenImageSearch('boxart')}
        onContextMenu={(event) => {
          event.preventDefault();
          onOpenContextMenu(event, 'boxart');
        }}
        className="h-36 w-auto aspect-[2/3] relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0"
      >
        {boxArtUrl && brokenBoxArtUrl !== boxArtUrl ? (
          (editedGame.boxArtIsVideo || selectedGame.boxArtIsVideo) ? (
            <video
              key={boxArtUrl}
              src={boxArtUrl}
              muted
              loop
              playsInline
              autoPlay
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              key={boxArtUrl}
              src={boxArtUrl}
              alt="Boxart"
              className="w-full h-full object-cover"
              onError={handleBrokenBoxArt}
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[8px] text-gray-600 text-center p-1">Boxart</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-[10px] text-white font-medium">Edit</span>
        </div>
      </div>

      <div
        onClick={() => onOpenImageSearch('logo')}
        onContextMenu={(event) => {
          event.preventDefault();
          onOpenContextMenu(event, 'logo');
        }}
        className="h-36 w-56 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0"
      >
        {(editedGame.logoUrl || selectedGame.logoUrl) ? (
          <div className="w-full h-full p-2 flex items-center justify-center">
            {(editedGame.logoIsVideo || selectedGame.logoIsVideo) ? (
              <video
                key={editedGame.logoUrl || selectedGame.logoUrl}
                src={editedGame.logoUrl || selectedGame.logoUrl}
                muted
                loop
                playsInline
                autoPlay
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <img
                key={editedGame.logoUrl || selectedGame.logoUrl}
                src={editedGame.logoUrl || selectedGame.logoUrl}
                alt="Logo"
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2">
            <span className="text-xs text-gray-600">Click to search for logo</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-xs text-white font-medium">Edit Logo</span>
        </div>
      </div>

      <div className="h-36 flex-1 flex gap-1">
        <div
          onClick={() => onOpenImageSearch('banner')}
          onContextMenu={(event) => {
            event.preventDefault();
            onOpenContextMenu(event, 'banner');
          }}
          className="flex-1 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors"
        >
          {(editedGame.bannerUrl || selectedGame.bannerUrl) ? (
            (editedGame.bannerIsVideo || selectedGame.bannerIsVideo) ? (
              <video
                key={editedGame.bannerUrl || selectedGame.bannerUrl}
                src={editedGame.bannerUrl || selectedGame.bannerUrl}
                muted
                loop
                playsInline
                autoPlay
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                key={editedGame.bannerUrl || selectedGame.bannerUrl}
                src={editedGame.bannerUrl || selectedGame.bannerUrl}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs text-gray-600">Banner</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-[10px] text-white font-medium">Edit</span>
          </div>
        </div>

        <div
          onClick={() => onOpenImageSearch('alternativeBanner')}
          onContextMenu={(event) => {
            event.preventDefault();
            onOpenContextMenu(event, 'alternativeBanner');
          }}
          className="flex-1 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors"
        >
          {(editedGame.alternativeBannerUrl || selectedGame.alternativeBannerUrl) ? (
            (editedGame.alternativeBannerIsVideo || selectedGame.alternativeBannerIsVideo) ? (
              <video
                key={editedGame.alternativeBannerUrl || selectedGame.alternativeBannerUrl}
                src={editedGame.alternativeBannerUrl || selectedGame.alternativeBannerUrl}
                muted
                loop
                playsInline
                autoPlay
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                key={editedGame.alternativeBannerUrl || selectedGame.alternativeBannerUrl}
                src={editedGame.alternativeBannerUrl || selectedGame.alternativeBannerUrl}
                alt="Alternative Banner"
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xs text-gray-600">Alt Banner</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-[10px] text-white font-medium">Edit</span>
          </div>
        </div>
      </div>

      <div
        onClick={() => onOpenImageSearch('icon')}
        onContextMenu={(event) => {
          event.preventDefault();
          onOpenContextMenu(event, 'icon');
        }}
        className="h-36 w-36 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0"
      >
        {(editedGame.iconUrl || selectedGame.iconUrl) ? (
          <div className="w-full h-full p-2 flex items-center justify-center">
            {(editedGame.iconIsVideo || selectedGame.iconIsVideo) ? (
              <video
                key={editedGame.iconUrl || selectedGame.iconUrl}
                src={editedGame.iconUrl || selectedGame.iconUrl}
                muted
                loop
                playsInline
                autoPlay
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <img
                key={editedGame.iconUrl || selectedGame.iconUrl}
                src={editedGame.iconUrl || selectedGame.iconUrl}
                alt="Icon"
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-center p-1">
            <span className="text-[10px] text-gray-600">Click to search for icon</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-[10px] text-white font-medium">Edit Icon</span>
        </div>
      </div>
    </div>
  );
}
