import { useEffect, useState, useCallback } from "react";
import axiosInstance from "../utils/axiosInstance";
import { getCachedData, setCachedData } from "../utils/apiCache";
import { getErrorMessage } from "../utils/helper";

/**
 * GET `url` and return its `data` payload. A cached response is shown immediately and then refreshed.
 * Switching `url` while a request is in flight ignores the older response.
 */
export const useCachedGet = (url, errorMessage = "Failed to load data") => {
  const [state, setState] = useState(() => {
    const cached = getCachedData(url);
    return { data: cached ? cached.data : null, loading: !cached, error: null };
  });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // switching url: start from that url's cache (derived during render, no effect needed)
  const [activeUrl, setActiveUrl] = useState(url);
  if (activeUrl !== url) {
    const cached = getCachedData(url);
    setActiveUrl(url);
    setState({ data: cached ? cached.data : null, loading: !cached, error: null });
  }

  useEffect(() => {
    let cancelled = false;
    const hadCache = !!getCachedData(url);

    axiosInstance
      .get(url)
      .then((res) => {
        if (cancelled) return;
        setCachedData(url, res.data);
        setState({ data: res.data.data, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(`Error fetching ${url}:`, err);
        // keep showing cached numbers if the refresh failed
        setState((prev) => ({ data: hadCache ? prev.data : null, loading: false, error: hadCache ? null : getErrorMessage(err, errorMessage) }));
      });

    return () => {
      cancelled = true;
    };
  }, [url, reloadKey, errorMessage]);

  return { ...state, reload };
};
