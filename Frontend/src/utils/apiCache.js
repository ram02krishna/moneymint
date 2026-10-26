let cache = {};

export let getCachedData = (key) => {
  return cache[key] || null;
};

export let setCachedData = (key, data) => {
  cache[key] = data;
};

export let clearCache = () => {
  cache = {};
};
