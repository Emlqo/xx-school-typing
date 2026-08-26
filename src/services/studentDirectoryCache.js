const values = new Map();
const pendingRequests = new Map();

export function getCachedStudentDirectory(cacheKey, loader) {
  if (values.has(cacheKey)) return Promise.resolve(values.get(cacheKey));
  if (pendingRequests.has(cacheKey)) return pendingRequests.get(cacheKey);

  let request;
  request = loader()
    .then((value) => {
      if (pendingRequests.get(cacheKey) === request) {
        values.set(cacheKey, value);
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
