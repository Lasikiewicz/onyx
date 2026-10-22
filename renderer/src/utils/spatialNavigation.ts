export interface SpatialRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type SpatialDirection = 'left' | 'right' | 'up' | 'down';

function center(rect: SpatialRect): { x: number; y: number } {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function wrapIndexes(
  originIndex: number,
  rects: SpatialRect[],
  direction: SpatialDirection,
  origin: { x: number; y: number },
): number[] {
  const wrapped: number[] = [];
  for (let index = 0; index < rects.length; index += 1) {
    if (index === originIndex) continue;
    const point = center(rects[index]);
    if (direction === 'right' && point.x < origin.x - 1) wrapped.push(index);
    else if (direction === 'left' && point.x > origin.x + 1) wrapped.push(index);
    else if (direction === 'down' && point.y < origin.y - 1) wrapped.push(index);
    else if (direction === 'up' && point.y > origin.y + 1) wrapped.push(index);
  }
  return wrapped;
}

/**
 * Nearest focus target in a direction. A target has to sit mostly forward of the origin,
 * so a tall button beside the current one is not chosen for Up. When nothing is forward,
 * the search wraps to the opposite edge, which is what an on-screen keyboard expects.
 */
export function pickSpatialIndex(
  originIndex: number,
  rects: SpatialRect[],
  direction: SpatialDirection,
): number | null {
  if (originIndex < 0 || originIndex >= rects.length || rects.length < 2) return null;
  const origin = center(rects[originIndex]);
  const forward: number[] = [];
  for (let index = 0; index < rects.length; index += 1) {
    if (index === originIndex) continue;
    const point = center(rects[index]);
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    const horizontal = direction === 'left' || direction === 'right';
    const primary = horizontal ? (direction === 'right' ? dx : -dx) : (direction === 'down' ? dy : -dy);
    const secondary = horizontal ? Math.abs(dy) : Math.abs(dx);
    if (primary <= 1) continue;
    if (secondary > primary * 2) continue;
    forward.push(index);
  }

  const pool = forward.length > 0 ? forward : wrapIndexes(originIndex, rects, direction, origin);
  if (pool.length === 0) return null;

  if (forward.length > 0) {
    const score = (index: number) => {
      const point = center(rects[index]);
      const dx = Math.abs(point.x - origin.x);
      const dy = Math.abs(point.y - origin.y);
      const horizontal = direction === 'left' || direction === 'right';
      const primary = horizontal ? dx : dy;
      const secondary = horizontal ? dy : dx;
      return primary + secondary * 2;
    };
    return pool.reduce((best, index) => (score(index) < score(best) ? index : best));
  }

  return pool.reduce((best, index) => {
    const point = center(rects[index]);
    const bestPoint = center(rects[best]);
    const edge = (pointToScore: { x: number; y: number }) => {
      if (direction === 'right') return pointToScore.x;
      if (direction === 'left') return -pointToScore.x;
      if (direction === 'down') return pointToScore.y;
      return -pointToScore.y;
    };
    const cross = (pointToScore: { x: number; y: number }) => (
      direction === 'left' || direction === 'right'
        ? Math.abs(pointToScore.y - origin.y)
        : Math.abs(pointToScore.x - origin.x)
    );
    if (Math.abs(edge(point) - edge(bestPoint)) > 1) {
      return edge(point) < edge(bestPoint) ? index : best;
    }
    return cross(point) < cross(bestPoint) ? index : best;
  });
}
