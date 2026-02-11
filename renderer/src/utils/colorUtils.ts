/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

/**
 * Calculate luminance of a color (used for contrast calculation)
 * Formula: https://www.w3.org/TR/AERT/#color-contrast
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5; // Default to medium luminance
  
  const { r, g, b } = rgb;
  // Normalize to 0-1
  const [rs, gs, bs] = [r, g, b].map(x => {
    x = x / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Get contrasting text color (light or dark) based on background hex color
 * Returns either '#ffffff' (white) for dark backgrounds or '#000000' (black) for light backgrounds
 */
export function getContrastingTextColor(backgroundHex: string): string {
  const luminance = getLuminance(backgroundHex);
  // If luminance > 0.179, use dark text; otherwise use light text
  return luminance > 0.179 ? '#000000' : '#ffffff';
}

/**
 * Get hover state color (darkened version of the base color)
 */
export function getDarkenedColor(hex: string, amount: number = 0.2): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const { r, g, b } = rgb;
  const factor = 1 - amount;
  const darkened = {
    r: Math.max(0, Math.floor(r * factor)),
    g: Math.max(0, Math.floor(g * factor)),
    b: Math.max(0, Math.floor(b * factor))
  };
  
  return `#${darkened.r.toString(16).padStart(2, '0')}${darkened.g.toString(16).padStart(2, '0')}${darkened.b.toString(16).padStart(2, '0')}`;
}
