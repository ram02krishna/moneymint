let cache = {};

export const getCachedData = (key) => cache[key] || null;

export const setCachedData = (key, data) => {
  cache[key] = data;
};

export const clearCache = () => {
  cache = {};
};
