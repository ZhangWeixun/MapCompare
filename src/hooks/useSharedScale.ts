import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'map-compare:z0';
const MIN_Z0 = 2;
const MAX_Z0 = 18;
const DEFAULT_Z0 = 10;
const PERSIST_DEBOUNCE_MS = 300;

function clampZ0(z0: number): number {
  return Math.min(MAX_Z0, Math.max(MIN_Z0, z0));
}

function loadInitialZ0(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_Z0;
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return DEFAULT_Z0;
    return clampZ0(parsed);
  } catch {
    return DEFAULT_Z0;
  }
}

/** 管理全局统一比例尺 z0（等效赤道 zoom），持久化到 localStorage（debounce） */
export function useSharedScale(): { z0: number; setZ0: (z0: number) => void } {
  const [z0, setZ0State] = useState<number>(loadInitialZ0);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  const setZ0 = useCallback((next: number) => {
    const clamped = clampZ0(next);
    setZ0State(clamped);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped));
      } catch {
        // 持久化失败可忽略（如隐私模式），不影响功能
      }
    }, PERSIST_DEBOUNCE_MS);
  }, []);

  return { z0, setZ0 };
}
