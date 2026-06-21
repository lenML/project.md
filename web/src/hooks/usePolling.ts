import { useEffect, useRef } from 'react';

export function usePolling(callback: () => void, enabled: boolean, intervalMs = 3000) {
  const savedCb = useRef(callback);
  savedCb.current = callback;

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => savedCb.current(), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);
}
