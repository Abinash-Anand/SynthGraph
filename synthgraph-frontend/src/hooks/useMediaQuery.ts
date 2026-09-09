"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to a media query as an external store.
 *
 * `useSyncExternalStore` is the right primitive here: the browser owns this
 * state, so reading it during render (rather than assigning it from an effect)
 * avoids a cascading second render on every mount.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => serverValue, [serverValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Coarse breakpoint used to shed 3D complexity on small devices. */
export function useIsCompact(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
