import { useEffect, useState, useCallback, useRef } from "react";
import axiosInstance from "../utils/axiosInstance";
import { getCachedData, setCachedData } from "../utils/apiCache";
import { getErrorMessage } from "../utils/helper";

/**
 * Loads one page of a month-scoped list.
 * - one request per change of month / page / reload()
 * - cached pages show instantly and are refreshed in the background
 * - changing the month goes back to page 1 without an extra request
 * - a slow response can never overwrite a newer one
 *
 * `pick(body)` turns the response body into { items, totalPages }.
 */
export const usePagedList = ({ path, month, pageSize, pick, errorMessage }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [pageMonth, setPageMonth] = useState(month);
  if (pageMonth !== month) {
    setPageMonth(month);
    setPage(1);
  }

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // keep the latest pick/errorMessage without making them effect dependencies
  const latest = useRef({ pick, errorMessage });
  useEffect(() => {
    latest.current = { pick, errorMessage };
  });

  const requestId = useRef(0);
  useEffect(() => {
    const id = ++requestId.current;
    const url = `${path}?month=${month}&page=${page}&limit=${pageSize}`;
    const cached = getCachedData(url);

    const apply = (body) => {
      const result = latest.current.pick(body);
      setItems(result.items || []);
      setTotalPages(result.totalPages || 1);
    };

    (async () => {
      if (cached) {
        apply(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const { data } = await axiosInstance.get(url);
        if (id !== requestId.current) return;
        setCachedData(url, data);
        apply(data);
      } catch (err) {
        if (id !== requestId.current || cached) return;
        setError(getErrorMessage(err, latest.current.errorMessage));
        setItems([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    })();
  }, [path, month, page, pageSize, reloadKey]);

  return { items, loading, error, page, setPage, totalPages, reload };
};
