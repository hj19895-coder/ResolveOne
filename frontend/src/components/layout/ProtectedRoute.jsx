import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({
  children,
  adminOnly = false,
  page = null,        // e.g. "dashboard", "tickets", "users"
  action = "canView", // which permission to check
}) {
  const { user, isSuperAdmin, can } = useAuth();

  // Not logged in → login
  if (!user) return <Navigate to="/login" replace />;

  // Admin-only route (Roles, Users, Master Data pages)
  if (adminOnly && !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return <Navigate to="/dashboard" replace />;

  // Page-level permission check for non-super-admins
  if (page && !can(page, action)) return <Navigate to="/unauthorized" replace />;

  return children;
}