import { useState, useEffect } from "react";
import api from "../api/axios";

export function useRoles() {
  const [roles, setRoles]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await api.get("/roles");
      setRoles(res.data.roles ?? []);
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  return { roles, loading, error, refetch: fetchRoles };
}