import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Header from "../components/layout/Header";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import EmptyState from "../components/ui/EmptyState";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
 
function initials(name = "") {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
 
const AVATAR_COLORS = [
  "from-indigo-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-blue-500 to-indigo-600",
  "from-red-500 to-rose-600",
  "from-pink-500 to-fuchsia-600",
];
 
function avatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
 
export default function Users() {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
 
  useEffect(() => {
    if (!isSuperAdmin) {
      navigate("/tickets");
      return;
    }
    api.get("/users")
.then((res) => {
  console.log('Users API response:', res.data);
  setUsers(res.data.users || []);
})
      .catch((err) => setError(err.response?.data?.message ?? "Failed to load users."))
      .finally(() => setLoading(false));
  }, [isSuperAdmin, navigate]);
 
  const filtered = users.filter(
    (u) =>
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );
 
  return (
    <Layout>
      <Header
        title="Users"
subtitle={`${users.length} members in workspace (${filtered.length} shown)`}
      />
      <div className="space-y-6">
 
        {/* Error */}
        {error && (
          <div className="bg-red-50/80 backdrop-blur-md border border-red-200 rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 text-red-700">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}
 
        {/* Main Card */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/60 overflow-hidden">
 
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-800">Team Members</h2>
              <p className="text-xs text-slate-500 mt-0.5">All users in your workspace</p>
            </div>
            <div className="relative w-full sm:w-72">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white/80 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Search users…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
 
          {/* Table Body */}
          {loading ? (
            <div className="py-16">
              <LoadingSpinner text="Loading users..." />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16">
              <EmptyState title="No users found" desc="No users match your search." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">User ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-blue-50/40 transition-colors duration-100 cursor-pointer group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0 bg-gradient-to-br ${avatarColor(u.name)}`}
                          >
                            {initials(u.name)}
                          </div>
                          <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                            {u.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 max-w-xs truncate">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            u.role?.name === "SUPERADMIN"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {u.role?.name ?? "USER"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          {u.id.slice(0, 12)}…
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
 
          {/* Footer */}
          {!loading && filtered.length > 0 && (
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
              <span className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of{" "}
                <span className="font-semibold text-slate-700">{users.length}</span> users
              </span>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}