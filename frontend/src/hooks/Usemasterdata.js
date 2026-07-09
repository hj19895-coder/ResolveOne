// hooks/useMasterData.js
// Fetches active dropdown options for a given MasterData type.
// Returns { options, loading, error } where options = [{ id, value }]

import { useState, useEffect } from "react";
import api from "../api/axios.js";

const cache = {}; // module-level cache so repeated mounts don't re-fetch

export function useMasterData(type) {
  const [options, setOptions]   = useState(cache[type] || []);
  const [loading, setLoading]   = useState(!cache[type]);
  const [error,   setError]     = useState(null);

  useEffect(() => {
    if (!type) return;
    if (cache[type]) {
      setOptions(cache[type]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api.get(`/master-data?type=${type}`)
      .then((res) => {
        if (!cancelled) {
          cache[type] = res.data;
          setOptions(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [type]);

  return { options, loading, error };
}

