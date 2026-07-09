import { useState, useEffect, useCallback, useRef } from "react";
import api from "../api/axios";

export function useTickets(statusFilter, priorityFilter, assignedToMeFilter, searchFilter, unassignedFilter, sortConfig, slaStatusFilter) {
  const [tickets, setTickets]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const [debouncedSearch, setDebouncedSearch] = useState(searchFilter);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchFilter);
      setPage(1);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, assignedToMeFilter, unassignedFilter, sortConfig?.key, sortConfig?.direction]);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page",  page);
      params.set("limit", pageSize);
      if (statusFilter) {
        const ids = (Array.isArray(statusFilter) ? statusFilter : statusFilter.split(',')).filter(Boolean);
        if (ids.length) ids.forEach(id => params.append("statusId", id));
      }
      if (priorityFilter) {
        const ids = (Array.isArray(priorityFilter) ? priorityFilter : priorityFilter.split(',')).filter(Boolean);
        if (ids.length) ids.forEach(id => params.append("priorityId", id));
      }
      if (assignedToMeFilter)  params.set("assignedToMe", "true");
      if (unassignedFilter)    params.set("unassigned", "true");
      if (slaStatusFilter)     params.set("slaStatus", slaStatusFilter);
      if (debouncedSearch?.trim()) params.set("search", debouncedSearch.trim()); // ← THIS was missing

      if (sortConfig?.key && sortConfig?.direction) {
        params.set("sortBy", sortConfig.key);
        params.set("sortDir", sortConfig.direction);
      }

      const res = await api.get(`/tickets?${params.toString()}`);
      setTickets(res.data.tickets ?? []);
      setTotal(res.data.total     ?? 0);
    } catch (e) {
      setError("Failed loading tickets");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, priorityFilter, assignedToMeFilter, debouncedSearch, unassignedFilter, sortConfig?.key, sortConfig?.direction, slaStatusFilter]);
  const handlePageSizeChange = (newSize) => {
    setPage(1);
    setPageSize(newSize);
  };

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  return { tickets, total, page, setPage, pageSize, setPageSize: handlePageSizeChange, loading, error, refetch: fetchTickets };
}