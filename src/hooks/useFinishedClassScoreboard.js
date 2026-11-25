import { useEffect, useReducer, useState } from 'react';
import { getFinishedClassScoreboard } from '../services/studentSecurityApi.js';
import { CLASS_SCOREBOARD_SETTLE_MS } from '../utils/classScoreboard.js';

export default function useFinishedClassScoreboard({ roomId, endsAt }) {
  const [state, setState] = useState(null);
  const [revision, refresh] = useReducer((value) => value + 1, 0);

  useEffect(() => {
    if (!roomId) {
      setState(null);
      return undefined;
    }
    const controller = new AbortController();
    const load = async () => {
      try {
        const result = await getFinishedClassScoreboard(roomId, controller.signal);
        if (!controller.signal.aborted) setState({ roomId, revision, result });
      } catch (error) {
        if (!controller.signal.aborted) setState({ roomId, revision, error });
      }
    };
    const timer = window.setTimeout(load, Math.max(0, endsAt + CLASS_SCOREBOARD_SETTLE_MS - Date.now()));
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [endsAt, revision, roomId]);

  const current = state?.roomId === roomId && state.revision === revision ? state : null;
  return { result: current?.result, error: current?.error, loading: Boolean(roomId && !current), refresh };
}
