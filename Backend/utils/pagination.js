const MAX_LIMIT = 100;

// Safe page/limit parsing: never NaN, never below 1, never above MAX_LIMIT.
const parsePagination = (query = {}, { defaultLimit = 10, maxLimit = MAX_LIMIT } = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

module.exports = { parsePagination, MAX_LIMIT };
