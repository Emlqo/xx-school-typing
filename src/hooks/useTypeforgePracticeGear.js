import { useEffect, useRef, useState } from 'react';
import { forgeOrigin } from './useTypeforgeEntry.js';
import { createTypeforgeEntry, verifyTypeforgePracticeGear } from '../services/studentSecurityApi.js';

export default function useTypeforgePracticeGear({ ready, studentId }) {
  const [ticket] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('typeforge-practice'));
  const [result, setResult] = useState(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const pending = useRef(null);

  useEffect(() => {
    if (!ticket) return;
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.slice(1));
    fragment.delete('typeforge-practice');
    url.hash = fragment.toString();
    history.replaceState(history.state, '', url);
  }, [ticket]);

  useEffect(() => {
    if (!ticket || !ready || !studentId) return undefined;
    if (!pending.current) pending.current = { studentId, job: verifyTypeforgePracticeGear(ticket) };
    if (pending.current.studentId !== studentId) return undefined;
    let active = true;
    pending.current.job.then(data => {
      if (active) setResult({ studentId, ...data });
    }).catch(error => {
      if (active) setResult({ studentId, error: error.message });
    });
    return () => { active = false; };
  }, [ready, studentId, ticket]);

  async function link() {
    if (!studentId || linking) return;
    setLinking(true);
    setLinkError('');
    try {
      const { url } = await createTypeforgeEntry({ returnToPractice: true });
      const destination = new URL(url);
      const fragment = new URLSearchParams(destination.hash.slice(1));
      if (destination.origin !== forgeOrigin || !fragment.has('pw-entry') || fragment.get('pw-practice') !== '1') {
        throw new Error('타자공방 장비를 가져올 주소를 확인하지 못했어요.');
      }
      window.location.assign(destination.href);
    } catch (error) {
      setLinkError(error.message || '타자공방 장비를 가져오지 못했어요.');
      setLinking(false);
    }
  }

  const verified = result?.studentId === studentId ? result : null;
  return { arrivalSettled: Boolean(verified), gear: verified?.expiresAt > Date.now() ? verified.gear : null,
    expiresAt: verified?.expiresAt, linking, error: linkError || verified?.error, link };
}
