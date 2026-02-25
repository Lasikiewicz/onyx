
export function calculateVirtualWindow(
  selectedIndex: number,
  totalItems: number,
  options: { bufferLeft: number; bufferRight: number }
) {
  const { bufferLeft, bufferRight } = options;

  const startIndex = Math.max(0, selectedIndex - bufferLeft);
  const endIndex = Math.min(totalItems, selectedIndex + bufferRight);

  return { startIndex, endIndex };
}

export function calculateLeftSpacerWidth(
  startIndex: number,
  itemWidth: number,
  itemPadding: number
) {
  if (startIndex <= 0) return 0;

  // Stride calculation based on LibraryCarousel.tsx layout:
  // Each item occupies: width + marginLeft + marginRight.
  // Plus the flex container gap between items.
  // marginLeft = itemPadding
  // marginRight = itemPadding
  // gap = itemPadding

  const gap = itemPadding;
  const stride = itemWidth + 2 * itemPadding + gap;

  // The item at `startIndex` should visually start at `startIndex * stride`.
  // With a spacer, it starts at `width(Spacer) + margin(Spacer) + gap`.
  // We assume spacer has 0 margins for simplicity.
  // So `width(Spacer) + gap = startIndex * stride`.
  // `width(Spacer) = startIndex * stride - gap`.

  return startIndex * stride - gap;
}
