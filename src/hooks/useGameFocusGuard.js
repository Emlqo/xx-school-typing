import { useEffect, useRef } from 'react';
import { watchGameFocus } from '../utils/fairPlay.js';

export default function useGameFocusGuard(enabled, onViolation) {
  const callback = useRef(onViolation);
  callback.current = onViolation;
  useEffect(() => {
    if (!enabled || !callback.current) return undefined;
    return watchGameFocus(reason => callback.current?.(reason));
  }, [enabled]);
}
