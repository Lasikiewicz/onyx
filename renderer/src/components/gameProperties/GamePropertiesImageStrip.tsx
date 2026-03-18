import type { EditableGameFields } from '../../types/EditableGame';

type ImageType = 'boxart' | 'logo' | 'banner' | 'alternativeBanner' | 'icon';

interface GamePropertiesImageStripProps {
  compact?: boolean;
  editedFields: EditableGameFields;
  editingDisabled: boolean;
  failedImageUrls: Set<string>;
  onActivateImageType: (type: ImageType) => void;
  onClearFailedImage: (type: ImageType, value: string) => void;
}

const imageConfigs: Array<{
  type: ImageType;
  label: string;
  field: keyof EditableGameFields;
  className: string;
  imageClassName: string;
}> = [
  {
    type: 'boxart',
    label: 'Boxart',
    field: 'boxArtUrl',
    className: 'h-36 flex items-center justify-center p-2',
    imageClassName: 'max-w-full max-h-full object-contain',
  },
  {
    type: 'logo',
    label: 'Logo',
    field: 'logoUrl',
    className: 'h-36 flex items-center justify-center p-2',
    imageClassName: 'max-w-full max-h-full object-contain',
  },
  {
    type: 'banner',
    label: 'Banner',
    field: 'bannerUrl',
    className: 'h-36',
    imageClassName: 'w-full h-full object-cover',
  },
  {
    type: 'alternativeBanner',
    label: 'Alt Banner',
    field: 'alternativeBannerUrl',
    className: 'h-36',
    imageClassName: 'w-full h-full object-cover',
  },
  {
    type: 'icon',
    label: 'Icon',
    field: 'iconUrl',
    className: 'h-36 flex items-center justify-center p-2',
    imageClassName: 'max-w-full max-h-full object-contain',
  },
];

export function GamePropertiesImageStrip({
  compact = false,
  editedFields,
  editingDisabled,
  failedImageUrls,
  onActivateImageType,
  onClearFailedImage,
}: GamePropertiesImageStripProps) {
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-5' : 'grid-cols-5 mb-6'}`}>
      {imageConfigs.map(({ className, field, imageClassName, label, type }) => {
        const value = editedFields[field];
        const imageUrl = typeof value === 'string' ? value : '';
        const hasFailed = imageUrl && failedImageUrls.has(imageUrl);

        return (
          <div key={type} className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-gray-500 text-center">{label}</div>
            <button
              type="button"
              onClick={() => onActivateImageType(type)}
              disabled={editingDisabled}
              className={`relative w-full rounded border border-gray-700 bg-gray-800 hover:border-blue-500 transition-colors overflow-hidden ${className} ${editingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {imageUrl && !hasFailed ? (
                <img
                  src={imageUrl}
                  alt={label}
                  className={imageClassName}
                  onError={() => onClearFailedImage(type, imageUrl)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500 px-2 text-center">
                  {hasFailed ? 'Image failed to load' : `Add ${label}`}
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
