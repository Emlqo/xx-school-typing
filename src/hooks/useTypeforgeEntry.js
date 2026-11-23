import { useEffect, useRef, useState } from 'react';
import { createTypeforgeEntry } from '../services/studentSecurityApi.js';

const channelName = 'pw_typing_typeforge_entry';
const forgeOrigin = 'https://typeforge-classroom.web.app';

function openChannel() {
  try { return new BroadcastChannel(channelName); } catch { return null; }
}

function findOpenStudentSession() {
  const channel = openChannel();
  if (!channel) return Promise.resolve(null);
  const request = crypto.randomUUID();
  const students = new Map();

  return new Promise((resolve, reject) => {
    let target;
    let timer;
    function finish(url, error) {
      clearTimeout(timer);
      channel.close();
      if (error) reject(new Error(error));
      else resolve(url);
    }

    channel.onmessage = ({ data }) => {
      if (data?.request !== request) return;
      if (data.kind === 'offer' && !target && typeof data.student === 'string' && typeof data.tab === 'string') {
        students.set(data.student, data.tab);
      }
      if (data.kind === 'entry' && target && data.tab === target) finish(data.url ?? null, data.error);
    };

    channel.postMessage({ kind: 'discover', request });
    timer = setTimeout(() => {
      if (students.size !== 1) return finish(null);
      target = students.values().next().value;
      channel.postMessage({ kind: 'issue', request, tab: target });
      timer = setTimeout(() => finish(null), 5000);
    }, 450);
  });
}

export default function useTypeforgeEntry({ ready, studentId, canIssue }) {
  const [requested, setRequested] = useState(() => new URLSearchParams(location.search).get('typeforge') === 'entry');
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const pending = useRef(null);

  useEffect(() => {
    if (!ready || !studentId) return undefined;
    const channel = openChannel();
    if (!channel) return undefined;
    const tab = crypto.randomUUID();
    let active = true;
    channel.onmessage = async ({ data }) => {
      if (typeof data?.request !== 'string') return;
      const { request } = data;
      if (data.kind === 'discover') channel.postMessage({ kind: 'offer', request, tab, student: studentId });
      if (data.kind !== 'issue' || data.tab !== tab) return;
      try {
        const { url } = await createTypeforgeEntry();
        if (active) channel.postMessage({ kind: 'entry', request, tab, url });
      } catch (failure) {
        if (active) channel.postMessage({ kind: 'entry', request, tab, error: failure.message });
      }
    };
    return () => { active = false; channel.close(); };
  }, [ready, studentId]);

  useEffect(() => {
    if (!requested || !ready) return undefined;
    let active = true;
    setStatus('checking');
    setError('');
    const key = JSON.stringify([studentId, canIssue, retry]);
    if (pending.current?.key !== key) {
      const job = canIssue ? createTypeforgeEntry().then(result => result.url) : findOpenStudentSession();
      pending.current = { key, job };
    }
    pending.current.job.then(url => {
      if (!active) return;
      if (!url) { setStatus('login'); return; }
      const destination = new URL(url);
      if (destination.origin !== forgeOrigin || !new URLSearchParams(destination.hash.slice(1)).has('pw-entry')) {
        throw new Error('타자공방 입장 주소를 확인하지 못했어요.');
      }
      location.replace(destination.href);
    }).catch(failure => {
      if (!active) return;
      setError(failure.message || '타자공방에 입장하지 못했어요.');
      setStatus('error');
    });
    return () => { active = false; };
  }, [requested, ready, studentId, canIssue, retry]);

  return {
    status: requested ? status : 'idle',
    error,
    retry: () => setRetry(value => value + 1),
    dismiss() {
      const url = new URL(location.href);
      url.searchParams.delete('typeforge');
      history.replaceState(history.state, '', url);
      setRequested(false);
    },
  };
}
