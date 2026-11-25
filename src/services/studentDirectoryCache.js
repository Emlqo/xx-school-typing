const values = new Map();
const pendingRequests = new Map();

export const STUDENT_HOME_CACHE_AGE_MS = 15 * 60 * 1000;

export function getCachedStudentDirectory(cacheKey, loader, { maxAge = Infinity, refresh = false } = {}) {
  if (pendingRequests.has(cacheKey)) return pendingRequests.get(cacheKey);
  const cached = values.get(cacheKey);
  if (!refresh && cached && Date.now() - cached.loadedAt < maxAge) return Promise.resolve(cached.value);

  let request;
  request = loader()
    .then((value) => {
      if (pendingRequests.get(cacheKey) === request) {
        values.set(cacheKey, { value, loadedAt: Date.now() });
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
  if (cached) cached.value = update(cached.value);
}

export function clearStudentDirectoryCache(userId = '') {
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
