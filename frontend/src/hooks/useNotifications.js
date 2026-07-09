// useNotifications.js
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "../api/axios";

const POLL_INTERVAL = 30000;

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewingAll, setViewingAll] = useState(false);
  const pollRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await axios.get("/notifications/unread-count");
      setUnreadCount(data.count || 0);
    } catch (err) {
      console.error("fetchUnreadCount error:", err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/notifications");
      setNotifications(data.notifications || []);
      setViewingAll(!!data.viewingAll);
    } catch (err) {
      console.error("fetchNotifications error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await axios.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error("markRead error:", err);
    }
  }, []);

  const markReadMultiple = useCallback(async (ids) => {
    if (!ids?.length) return;
    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - ids.length));
    try {
      await Promise.all(ids.map((id) => axios.patch(`/notifications/${id}/read`)));
    } catch (err) {
      console.error("markReadMultiple error:", err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await axios.patch("/notifications/read-all");
    } catch (err) {
      console.error("markAllRead error:", err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    viewingAll,
    fetchNotifications,
    markRead,
    markAllRead,
    markReadMultiple,
  };
}