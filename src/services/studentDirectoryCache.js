const values = new Map();
const pendingRequests = new Map();
const storagePrefix = 'pw-student-home:';

export const STUDENT_HOME_CACHE_AGE_MS = 15 * 60 * 1000;

function readStored(cacheKey) {
  try {
    const cached = JSON.parse(globalThis.sessionStorage?.getItem(storagePrefix + cacheKey) || 'null');
    return cached && Number.isFinite(cached.loadedAt) ? { ...cached, persist: true } : undefined;
  } catch {
    return undefined;
  }
}

function writeStored(cacheKey, cached) {
  if (!cached.persist) return;
  try {
    globalThis.sessionStorage?.setItem(storagePrefix + cacheKey, JSON.stringify({
      value: cached.value,
      loadedAt: cached.loadedAt,
    }));
  } catch {
    // The in-memory cache remains available when browser storage is restricted.
  }
}

export function getCachedStudentDirectory(cacheKey, loader, { maxAge = Infinity, refresh = false, persist = false } = {}) {
  if (pendingRequests.has(cacheKey)) return pendingRequests.get(cacheKey);
  const cached = values.get(cacheKey) ?? (persist ? readStored(cacheKey) : undefined);
  if (!refresh && cached && Date.now() - cached.loadedAt < maxAge) {
    values.set(cacheKey, cached);
    return Promise.resolve(cached.value);
  }

  let request;
  request = loader()
    .then((value) => {
      if (pendingRequests.get(cacheKey) === request) {
        const entry = { value, loadedAt: Date.now(), persist };
        values.set(cacheKey, entry);
        writeStored(cacheKey, entry);
        pendingRequests.delete(cacheKey);
      }
      return value;
    })
    .catch((error) => {
      if (pendingRequests.get(cacheKey) === request) {
        pendingRequests.delete(cacheKey);
      }
      throw error;
    });
  pendingRequests.set(cacheKey, request);
  return request;
}

export function updateCachedStudentDirectory(cacheKey, update) {
  const cached = values.get(cacheKey);
  if (cached) {
    cached.value = update(cached.value);
    writeStored(cacheKey, cached);
  }
}

export function clearStudentDirectoryCache(userId = '') {
  const storedPrefix = storagePrefix + (userId ? `${userId}:` : '');
  try {
    const storage = globalThis.sessionStorage;
    if (storage) {
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (key?.startsWith(storedPrefix)) storage.removeItem(key);
      }
    }
  } catch {
    // Storage can be unavailable in private and restricted browser contexts.
  }
  if (!userId) {
    values.clear();
    pendingRequests.clear();
    return;
  }

  const prefix = `${userId}:`;
  [...values.keys()]
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => values.delete(key));
  [...pendingRequests.keys()]
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => pendingRequests.delete(key));
}
