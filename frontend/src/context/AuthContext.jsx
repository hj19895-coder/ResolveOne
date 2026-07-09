import { createContext, useContext, useState, useCallback } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // Check if user can do [action] on [page]
  // Super Admin always returns true
  const can = useCallback((page, action = "canView") => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    const perm = user.permissions?.find(p => p.page === page);
    return perm?.[action] ?? false;
  }, [user, isSuperAdmin]);

  const canView   = useCallback((page) => can(page, "canView"),   [can]);
  const canCreate = useCallback((page) => can(page, "canCreate"), [can]);
  const canEdit   = useCallback((page) => can(page, "canEdit"),   [can]);
  const canDelete = useCallback((page) => can(page, "canDelete"), [can]);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isSuperAdmin,
      can,
      canView,
      canCreate,
      canEdit,
      canDelete,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};