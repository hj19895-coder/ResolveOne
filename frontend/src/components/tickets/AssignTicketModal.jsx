import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import api from "../../api/axios";
 
export default function AssignTicketModal({ ticket, onClose, onAssigned }) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(ticket.assignedToId ?? "");
  const [selectedGroupId, setSelectedGroupId] = useState(ticket.groupId ?? "");
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState(null);
 
  // Which dropdown is open: null | '' | 'group' | 'tech'
  const [openDrop, setOpenDrop] = useState(null);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const [techSearch, setTechSearch] = useState("");
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
 
  const groupBtnRef = useRef(null);
  const techBtnRef = useRef(null);
  const searchInputRef = useRef(null);
 
  useEffect(() => {
    api.get("/users")
      .then((res) => {
        const list = res.data.users || res.data || [];
        const arr = Array.isArray(list) ? list : [];
        setUsers(arr);
        if (!selectedUserId && arr.length) setSelectedUserId(arr[0].id);
      })
      .catch(() => setError("Failed to load users."))
      .finally(() => setUsersLoading(false));
  }, []);
 
  useEffect(() => {
    api.get("/master-data?type=GROUP")
      .then((res) => {
        const list = res.data.data || res.data || [];
        const arr = Array.isArray(list) ? list : [];
        setGroups(arr.map(item => ({ id: item.id, name: item.value ?? item.name })));
      })
      .catch(() => {});
  }, []);
 
  // Global outside-click closes any open dropdown
  useEffect(() => {
    if (!openDrop) return;
    const handler = () => setOpenDrop(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDrop]);
 
  // Auto-focus search when tech dropdown opens
  useEffect(() => {
    if (openDrop === 'tech' && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }
    if (openDrop !== 'tech') setTechSearch("");
  }, [openDrop]);
 
  const toggleDrop = (name, btnRef) => {
    if (openDrop === name) { setOpenDrop(null); return; }
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpenDrop(name);
  };
 
  const handleAssign = async () => {
    if (!selectedUserId) { setError("Please select a technician."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.put("/tickets/assign", {
        ticketId: ticket.id,
        assignedToId: selectedUserId,
        groupId: selectedGroupId || undefined,
      });
      onAssigned(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? "Assignment failed.");
    } finally {
      setLoading(false);
    }
  };
 
  const shortId = (id = "") => {
    const s = String(id ?? '');
    return s.length <= 6 ? s : s.slice(0, 8).toUpperCase();
  };
 
  const filteredUsers = users.filter((u) => {
    const matchSearch = !techSearch ||
      (u.name || '').toLowerCase().includes(techSearch.toLowerCase());
    const matchOnline = !showOnlineOnly || u.online === true || u.status === 'online';
    return matchSearch && matchOnline;
  });
 
  const selectedUser = users.find(u => String(u.id) === String(selectedUserId));
  const selectedGroup = groups.find(g => String(g.id) === String(selectedGroupId));
 
  const fieldStyle = {
    background: '#F4F7FE',
    border: '1px solid rgba(200,190,255,0.5)',
    color: '#1B2559',
  };
 
  const portalStop = (e) => e.stopPropagation();
 
  // Generic simple dropdown portal (for/group)
  const SimpleDropPortal = ({ items, selectedId, onSelect, emptyText }) => (
    createPortal(
      <div
        onMouseDown={portalStop}
        style={{
          position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width,
          zIndex: 999999,
          background: '#fff',
          border: '1px solid rgba(200,190,255,0.5)',
          borderRadius: 12,
          boxShadow: '0 8px 28px rgba(100,80,200,0.14), 0 2px 8px rgba(0,0,0,0.06)',
          padding: '4px',
          maxHeight: 180, overflowY: 'auto',
        }}
      >
        {items.length === 0 ? (
          <div style={{ padding: '8px 12px', fontSize: 12, color: '#94a3b8' }}>{emptyText}</div>
        ) : items.map((item) => {
          const isSel = String(item.id) === String(selectedId);
          return (
            <button
              key={item.id} type="button"
              onClick={() => { onSelect(item.id); setOpenDrop(null); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 12px', borderRadius: 9, fontSize: 13,
                background: isSel ? 'rgba(100,80,200,0.1)' : 'transparent',
                color: isSel ? '#4318FF' : '#2D1F6E',
                fontWeight: isSel ? 600 : 400,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'rgba(100,80,200,0.06)'; }}
              onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
            >
              {item.name}
            </button>
          );
        })}
      </div>,
      document.body
    )
  );
 
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(67,24,255,0.06)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: '100%', maxWidth: 420,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(200,190,255,0.45)',
          borderRadius: 18,
          boxShadow: '0 8px 40px rgba(100,80,200,0.18), 0 2px 12px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 12px', borderBottom: '1px solid rgba(200,190,255,0.3)' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e1b4b' }}>Assign Ticket</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ padding: '2px 10px', fontSize: 11, fontWeight: 600, borderRadius: 20, background: 'rgba(67,24,255,0.1)', color: '#4318FF' }}>
                #{ticket.ticketNumber ?? shortId(ticket.id)}
              </span>
              <span style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                {ticket.subject || ticket.title}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 10, color: '#94a3b8', flexShrink: 0 }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100,80,200,0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
 
        {/* ── Body ── */}
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && (
            <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#b91c1c', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM13.707 12.707a1 1 0 01-1.414 0L10 10.414l-2.293 2.293a1 1 0 01-1.414-1.414L8.586 10 6.293 7.707a1 1 0 011.414-1.414L10 8.586l2.293-2.293a1 1 0 011.414 1.414L11.414 10l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
 
          {/* Group */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 5 }}>Group</div>
            <button
              ref={groupBtnRef}
              type="button"
              onClick={() => toggleDrop('group', groupBtnRef)}
              style={{ ...fieldStyle, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}
            >
              <span style={{ color: selectedGroup ? '#1B2559' : '#94a3b8' }}>
                {selectedGroup ? selectedGroup.name : 'Select Group'}
              </span>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.4, transform: openDrop === 'group' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDrop === 'group' && <SimpleDropPortal items={groups} selectedId={selectedGroupId} onSelect={setSelectedGroupId} emptyText="Select Group" />}
          </div>
 
          {/* Technician */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: 5 }}>
              Technician <span style={{ color: '#ef4444' }}>*</span>
            </div>
            {usersLoading ? (
              <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 0' }}>Loading technicians...</div>
            ) : (
              <>
                <button
                  ref={techBtnRef}
                  type="button"
                  onClick={() => toggleDrop('tech', techBtnRef)}
                  style={{ ...fieldStyle, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}
                >
                  {selectedUser ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: (selectedUser.online || selectedUser.status === 'online') ? '#22c55e' : '#cbd5e1', border: '1px solid rgba(0,0,0,0.08)' }} />
                      <span style={{ color: '#1B2559', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedUser.name}{selectedUser.role?.name ? ` (${selectedUser.role.name})` : ''}
                      </span>
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>Select technician...</span>
                  )}
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: 0.4, transform: openDrop === 'tech' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
 
                {openDrop === 'tech' && createPortal(
                  <div
                    onMouseDown={portalStop}
                    style={{
                      position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width,
                      zIndex: 999999,
                      background: '#fff',
                      border: '1px solid rgba(200,190,255,0.5)',
                      borderRadius: 12,
                      boxShadow: '0 8px 28px rgba(100,80,200,0.14), 0 2px 8px rgba(0,0,0,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Search */}
                    <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(200,190,255,0.25)', position: 'relative' }}>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={techSearch}
                        onChange={(e) => setTechSearch(e.target.value)}
                        placeholder="Search..."
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          padding: '6px 28px 6px 10px',
                          fontSize: 12, borderRadius: 8, outline: 'none',
                          background: '#F4F7FE',
                          border: '1px solid rgba(200,190,255,0.4)',
                          color: '#1B2559',
                        }}
                      />
                      <svg width="13" height="13" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        <circle cx="11" cy="11" r="7" strokeWidth="2" /><path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
 
                    {/* List */}
                    <div style={{ maxHeight: 188, overflowY: 'auto', padding: '4px' }}>
                      {filteredUsers.length === 0 ? (
                        <div style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>No technicians found</div>
                      ) : filteredUsers.map((u) => {
                        const isSel = String(u.id) === String(selectedUserId);
                        const isOnline = u.online === true || u.status === 'online';
                        const initials = String(u.name || '').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
                        return (
                          <button
                            key={u.id} type="button"
                            onClick={() => { setSelectedUserId(u.id); setOpenDrop(null); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                              padding: '7px 8px', borderRadius: 8, cursor: 'pointer',
                              background: isSel ? 'rgba(100,80,200,0.1)' : 'transparent',
                              color: isSel ? '#4318FF' : '#2D1F6E',
                              fontWeight: isSel ? 600 : 400, textAlign: 'left',
                            }}
                            onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'rgba(100,80,200,0.06)'; }}
                            onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                          >
                            {/* Online dot */}
                            <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: isOnline ? '#22c55e' : '#cbd5e1', border: '1px solid rgba(0,0,0,0.08)' }} />
                            {/* Avatar */}
                            <span style={{ width: 20, height: 20, borderRadius: 7, flexShrink: 0, background: isSel ? 'linear-gradient(135deg,#4318FF,#6c47ff)' : 'linear-gradient(135deg,#94a3b8,#64748b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                              {initials}
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                            </span>
                            {isSel && (
                              <svg width="12" height="12" fill="none" stroke="#4318FF" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
 
                    {/* Show All / Online */}
                    <div style={{ borderTop: '1px solid rgba(200,190,255,0.25)', padding: '6px 12px', display: 'flex', gap: 18, alignItems: 'center' }}>
                      {[{ label: 'Show All', val: false }, { label: 'Online', val: true }].map(({ label, val }) => (
                        <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, cursor: 'pointer', userSelect: 'none', color: showOnlineOnly === val ? '#4318FF' : '#64748b', fontWeight: showOnlineOnly === val ? 600 : 400 }}>
                          <input type="radio" name="techFilter" checked={showOnlineOnly === val} onChange={() => setShowOnlineOnly(val)} style={{ accentColor: '#4318FF' }} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>,
                  document.body
                )}
              </>
            )}
          </div>
        </div>
 
        {/* ── Footer ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '12px 18px', borderTop: '1px solid rgba(200,190,255,0.3)', background: 'rgba(245,243,255,0.5)' }}>
          <button
            type="button" onClick={onClose} disabled={loading}
            style={{ padding: '7px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(200,190,255,0.4)', color: '#4318FF', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <button
            type="button" onClick={handleAssign} disabled={loading || usersLoading || !selectedUserId}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 18px', fontSize: 13, fontWeight: 600, borderRadius: 10, color: '#fff', background: 'linear-gradient(135deg, #4318FF 0%, #6c47ff 100%)', boxShadow: '0 4px 14px rgba(67,24,255,0.35)', cursor: loading || usersLoading || !selectedUserId ? 'not-allowed' : 'pointer', opacity: loading || usersLoading || !selectedUserId ? 0.55 : 1 }}
          >
            {loading ? (
              <>
                <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                Assigning...
              </>
            ) : 'Assign Technician'}
          </button>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
 