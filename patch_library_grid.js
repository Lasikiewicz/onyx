const fs = require('fs');
const path = 'renderer/src/components/LibraryGrid.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add stable callback refs
const callbackRefCode = `
  // Memoize item IDs for SortableContext to prevent unnecessary re-renders
  const itemIds = useMemo(() => items.map((g) => g.id), [items]);

  // Performance Optimization: Stabilize callbacks passed to SortableGameCard
  // App.tsx passes inline functions (like onGameContextMenu) which defeats React.memo
  // by using refs, we keep the callback identity stable while always calling the latest function.
  const callbacksRef = useRef({ onPlay, onGameClick, onEdit, onGameContextMenu });
  useEffect(() => {
    callbacksRef.current = { onPlay, onGameClick, onEdit, onGameContextMenu };
  });

  const stableOnPlay = useCallback((game: Game) => {
    callbacksRef.current.onPlay?.(game);
  }, []);

  const stableOnGameClick = useCallback((game: Game) => {
    callbacksRef.current.onGameClick?.(game);
  }, []);

  const stableOnEdit = useCallback((game: Game) => {
    callbacksRef.current.onEdit?.(game);
  }, []);

  const stableOnContextMenu = useCallback((game: Game, x: number, y: number) => {
    callbacksRef.current.onGameContextMenu?.(game, x, y);
  }, []);

  // Memoize focus callback to keep child props stable`;

content = content.replace(
  "  // Memoize item IDs for SortableContext to prevent unnecessary re-renders\n  const itemIds = useMemo(() => items.map((g) => g.id), [items]);\n\n  // Memoize focus callback to keep child props stable",
  callbackRefCode
);

// 2. Replace props in SortableGameCard
content = content.replace(
  /onPlay=\{onPlay\}/g,
  "onPlay={stableOnPlay}"
).replace(
  /onClick=\{onGameClick\}/g,
  "onClick={stableOnGameClick}"
).replace(
  /onEdit=\{onEdit\}/g,
  "onEdit={stableOnEdit}"
).replace(
  /onContextMenu=\{onGameContextMenu\}/g,
  "onContextMenu={stableOnContextMenu}"
);

fs.writeFileSync(path, content);
console.log("Patch applied!");
