// src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import "./Sidebar.css";

const icons = {
  settings: (
    <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10" cy="10" r="2" />
      <path d="M10 2v3M10 15v3M18 10h-3M5 10H2M15.5 4.5l-2.1 2.1M7 16.5l2.1-2.1M15.5 15.5l-2.1-2.1M7 4.5l2.1 2.1" />
    </svg>
  ),
  logout: (
    <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M13 6l4 4m0 0l-4 4m4-4H7m0-7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h6" />
    </svg>
  ),
  dashboard: (
    <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="2" width="7" height="7" rx="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" />
    </svg>
  ),
  tickets: (
    <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M2 7.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a1.5 1.5 0 0 0 0 3v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1a1.5 1.5 0 0 0 0-3V7.5Z" />
      <path d="M12 6v8" strokeDasharray="2 2" />
    </svg>
  ),
  users: (
    <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M3 17c0-3.314 2.686-6 6-6s6 2.686 6 6" />
      <path d="M15 3a4 4 0 0 1 0 8M17 17c0-2.21-1.343-4-3-5" />
    </svg>
  ),
  masterData: (
    <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <ellipse cx="10" cy="6" rx="7" ry="3" />
      <path d="M3 6v4c0 1.657 3.134 3 7 3s7-1.343 7-3V6" />
      <path d="M3 10v4c0 1.657 3.134 3 7 3s7-1.343 7-3v-4" />
    </svg>
  ),
  roles: (
    <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 6h12M4 10h6M4 14h4"/>
      <rect x="2" y="3" width="16" height="14" rx="2"/>
    </svg>
  ),
  sort: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v10M5 6l3-3 3 3M5 10l3 3 3-3" />
    </svg>
  ),
  reports: (
    <svg 
      className="nav-icon" 
      viewBox="0 0 20 20" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.6"
    >
      <path d="M4 16V8" />
      <path d="M10 16V4" />
      <path d="M16 16v-6" />
      <path d="M2 16h16" />
    </svg>
  ),
  templates: (
    <svg className="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="14" height="4" rx="1" />
      <rect x="3" y="9" width="14" height="4" rx="1" />
      <rect x="3" y="15" width="14" height="2" rx="1" />
    </svg>
  ),

};

function initials(name = "") {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function Sidebar() {
  const { user, logout, isSuperAdmin, canView } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sb_collapsed") === "true"
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dark = typeof document !== "undefined" && document.documentElement.dataset.dashboardTheme === "dark";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleCollapse = () => {
    setCollapsed((v) => {
      localStorage.setItem("sb_collapsed", String(!v));
      return !v;
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Card wrapper — toggle is SIBLING of aside, not child, so overflow:hidden won't clip it */}
      <div className="sidebar-card-wrapper">

        {/* Toggle button lives here, outside <aside> */}
        <button
          className={`sidebar-toggle${collapsed ? " is-collapsed" : ""}`}
          onClick={toggleCollapse}
          aria-label="Toggle sidebar"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M7.5 2L3.5 6l4 4" />
          </svg>
        </button>

        <aside className={`sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>

          {/* ── Logo ── */}
          <div className="sidebar__logo">
            <div className="sidebar__logo-icon">
              <svg className="thunder-icon" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L5 14H11L9 22L19 9H13V2Z" fill="currentColor" />
              </svg>
            </div>
            <div className="sidebar__logo-wordmark">
              <div className="sidebar__logo-text">ResolveOne</div>
              <div className="sidebar__logo-sub">AI Support System</div>
            </div>
          </div>

          {/* ── Nav ── */}
          <nav className="sidebar__nav">
            <div className="nav-section">
              <div className="nav-section__label">Main</div>

              {(isSuperAdmin || canView("dashboard")) && (
                <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                  {icons.dashboard}
                  <span className="nav-link-label">Dashboard</span>
                  <span className="nav-tooltip">Dashboard</span>
                </NavLink>
              )}

              {(isSuperAdmin || canView("tickets")) && (
                <NavLink to="/tickets" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                  {icons.tickets}
                  <span className="nav-link-label">Tickets</span>
                  <span className="nav-tooltip">Tickets</span>
                </NavLink>
              )}
              

              {(isSuperAdmin || canView("users")) && (
                <NavLink to="/super-admin/users" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                  {icons.users}
                  <span className="nav-link-label">Users</span>
                  <span className="nav-tooltip">Users</span>
                </NavLink>
              )}

              {(isSuperAdmin || canView("master-data")) && (
                <NavLink to="/super-admin/master-data" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                  {icons.masterData}
                  <span className="nav-link-label">Master Data</span>
                  <span className="nav-tooltip">Master Data</span>
                </NavLink>
              )}

              {(isSuperAdmin || canView("tickets")) && (
                <NavLink to="/reports" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                  {icons.reports}
                  <span className="nav-link-label">Reports & Analysis</span>
                  <span className="nav-tooltip">Reports & Analysis</span>
                </NavLink>
              )}

              {(isSuperAdmin || canView("templates")) && (
                <NavLink to="/templates" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                  {icons.templates}
                  <span className="nav-link-label">Templates</span>
                  <span className="nav-tooltip">Templates</span>
                </NavLink>
              )}
            </div>

            {isSuperAdmin && (
              <>
                <div className="nav-divider" />
                <div className="nav-section">
                  <div className="nav-section__label">Admin</div>
                  <NavLink to="/super-admin/roles" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                    {icons.roles}
                    <span className="nav-link-label">Roles & Permissions</span>
                    <span className="nav-tooltip">Roles & Permissions</span>
                  </NavLink>
                </div>
              </>
            )}
          </nav>

          {/* ── User footer ── */}
          <div className="sidebar__user" ref={dropdownRef}>
            <div className="sidebar__user-card">
              <button
                className="sidebar__avatar-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="User menu"
                aria-expanded={dropdownOpen}
              >
                <div className="sidebar__avatar-wrap">
                  <div className="sidebar__avatar">{initials(user?.name)}</div>
                  <span className="sidebar__avatar-online" />
                </div>
              </button>

              <div className="sidebar__user-info">
                <div className="sidebar__user-name">{user?.name ?? "User"}</div>
                <div className="sidebar__user-role">{user?.email ?? user?.role}</div>
              </div>
              
              {/* Dropdown trigger button - hidden when collapsed */}
              <button
                className="user-menu-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="User menu"
                aria-expanded={dropdownOpen}
                title="Menu"
              >
                {icons.sort}
              </button>
            </div>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="user-dropdown">
                <div className="user-dropdown__email">
                  {user?.email ?? user?.name}
                </div>
                
                <button
                  className="user-dropdown__item"
                  onClick={() => {
                    navigate("/settings");
                    setDropdownOpen(false);
                  }}
                >
                  {icons.settings}
                  <span>Settings</span>
                </button>

                <button
                  className="user-dropdown__item user-dropdown__item--danger"
                  onClick={handleLogout}
                >
                  {icons.logout}
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>

        </aside>
      </div>
    </>
  );
}
