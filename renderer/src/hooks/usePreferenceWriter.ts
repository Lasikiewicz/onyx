import { useCallback } from 'react';

export function usePreferenceWriter() {
  const savePreferences = useCallback((patch: Record<string, unknown>) => {
    window.electronAPI.savePreferences(patch as any);
  }, []);

  const saveValue = useCallback(<T,>(setter: (value: T) => void, prefKey: string, value: T) => {
    setter(value);
    savePreferences({ [prefKey]: value });
  }, [savePreferences]);

  const saveByViewValue = useCallback(<TView extends string, TValue, TMap extends Record<TView, TValue>>(
    current: TMap,
    setter: (value: TMap) => void,
    prefKey: string,
    view: TView,
    value: TValue,
  ) => {
    const next = { ...current, [view]: value } as TMap;
    setter(next);
    savePreferences({ [prefKey]: next });
    return next;
  }, [savePreferences]);

  return {
    saveByViewValue,
    savePreferences,
    saveValue,
  };
}
