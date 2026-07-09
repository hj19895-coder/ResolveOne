// ═══════════════════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════════════════
const API_BASE = "/api";


// ═══════════════════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════════════════
let curPage  = 1;
let pageSize = 25;
let sortKey  = 'id';
let sortDir  = 'DESC';
let editId   = null;
let debTimer = null;
let totalTickets = 0;

// ═══════════════════════════════════════════════════════════════════════════
//  API HELPERS
// ═══════════════════════════════════════════════════════════════════════════
async function apiFetch(url, options = {}) {
  const res = await fetch(API_BASE + url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.error || data.errors?.[0]?.msg || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function apiGet(url)         { return apiFetch(url); }
async function apiPost(url, body)  { return apiFetch(url, { method: 'POST',   body: JSON.stringify(body) }); }
async function apiPatch(url, body) { return apiFetch(url, { method: 'PATCH',  body: JSON.stringify(body) }); }
async function apiDelete(url)      { return apiFetch(url, { method: 'DELETE' }); }

// ═══════════════════════════════════════════════════════════════════════════
//  PILL HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function statusPill(s) {
  const m = { 'Open':'open', 'Closed':'closed', 'In-Progress':'inprog' };
  return `<span class="pill ${m[s]||''}">${s}</span>`;
}
function typePill(t) {
  return t === 'Issues'
    ? `<span class="pill issue">Issues</span>`
    : `<span class="pill service">Service/CR</span>`;
}
function priorityPill(p) {
  const m = { P2:'p2', P3:'p3', P4:'p4' };
  return `<span class="pill ${m[p]||'p4'}">${p}</span>`;
}
function rootPill(r) {
  if (!r || r === '-') return '-';
  const m = { Config:'config', Product:'product' };
  return `<span class="pill ${m[r]||''}">${r}</span>`;
}
function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-IN', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  LOAD TICKETS
// ═══════════════════════════════════════════════════════════════════════════
async function loadTickets() {
  setTableLoading(true);
  const params = new URLSearchParams({
    page:     curPage,
    limit:    pageSize,
    sort_by:  sortKey,
    sort_dir: sortDir,
  });
  const q      = document.getElementById('search').value.trim();
  const client = document.getElementById('f-client').value;
  const status = document.getElementById('f-status').value;
  const type   = document.getElementById('f-type').value;
  const prio   = document.getElementById('f-priority').value;

  if (q)      params.set('search',      q);
  if (client) params.set('client_name', client);
  if (status) params.set('status',      status);
  if (type)   params.set('ticket_type', type);
  if (prio)   params.set('priority',    prio);

  try {
    const res = await apiGet(`/tickets?${params}`);
    renderTable(res.tickets);
    renderPagination(res);
    updateStats();
  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('tbody').innerHTML =
      `<tr><td colspan="12" class="empty-state">Failed to load tickets: ${err.message}</td></tr>`;
  } finally {
    setTableLoading(false);
  }
}

function setTableLoading(on) {
  const tbody = document.getElementById('tbody');
  if (on) {
    tbody.innerHTML = `<tr class="loading-row"><td colspan="12"><div class="spinner"></div> Loading…</td></tr>`;
  }
}

function renderTable(tickets) {
  const tbody = document.getElementById('tbody');
  if (!tickets.length) {
    tbody.innerHTML = `<tr><td colspan="12" class="empty-state">No tickets found. Try adjusting your filters.</td></tr>`;
    return;
  }
  tbody.innerHTML = tickets.map(t => `<tr>
    <td><span class="id-link" onclick="openEditModal(${t.id})">#${t.id}</span></td>
    <td>${t.client_name}</td>
    <td class="subject-cell" title="${t.subject}">${t.subject}</td>
    <td>${typePill(t.ticket_type)}</td>
    <td>${priorityPill(t.priority)}</td>
    <td>${t.severity || '-'}</td>
    <td>${t.requester_name}</td>
    <td class="created-cell">${fmtDate(t.created_at)}</td>
    <td class="assignee-cell">${t.assignee || '-'}</td>
    <td>${rootPill(t.root_cause)}</td>
    <td>${statusPill(t.status)}</td>
    <td>
      <button class="btn sm" onclick="openEditModal(${t.id})" title="Edit">✏️</button>
      <button class="btn sm danger" onclick="quickDelete(${t.id})" title="Delete">🗑</button>
    </td>
  </tr>`).join('');
}

function renderPagination(res) {
  totalTickets = res.total;
  const start  = res.offset + 1;
  const end    = Math.min(res.offset + res.limit, res.total);
  document.getElementById('page-info').textContent =
    `${start}–${end} of ${res.total} tickets  ·  Page ${res.page} of ${res.pages}`;
  document.getElementById('btn-prev').disabled = res.page <= 1;
  document.getElementById('btn-next').disabled = res.page >= res.pages;
}

async function updateStats() {
  try {
    const res = await apiGet('/tickets/stats');
    const s   = res.stats;
    document.getElementById('total-badge').textContent = s.total + ' tickets';
    document.getElementById('s-total').textContent  = s.total;
    document.getElementById('s-open').textContent   = s.open;
    document.getElementById('s-inprog').textContent = s.in_progress;
    document.getElementById('s-closed').textContent = s.closed;
  } catch (_) {}
}

function prevPage() { if (curPage > 1) { curPage--; loadTickets(); } }
function nextPage() { curPage++; loadTickets(); }

function toggleSort(col) {
  if (sortKey === col) {
    sortDir = sortDir === 'DESC' ? 'ASC' : 'DESC';
  } else {
    sortKey = col;
    sortDir = 'DESC';
  }
  document.querySelectorAll('.sort-arrow').forEach(el => el.textContent = '');
  const el = document.getElementById('arr-' + col);
  if (el) el.textContent = sortDir === 'ASC' ? '▲' : '▼';
  curPage = 1;
  loadTickets();
}

function debounceLoad() {
  clearTimeout(debTimer);
  debTimer = setTimeout(() => { curPage = 1; loadTickets(); }, 350);
}

function clearFilters() {
  document.getElementById('search').value = '';
  ['f-client','f-status','f-type','f-priority'].forEach(id => document.getElementById(id).value = '');
  curPage = 1;
  loadTickets();
}

// ═══════════════════════════════════════════════════════════════════════════
//  CLIENT FILTER POPULATION
// ═══════════════════════════════════════════════════════════════════════════
async function loadClientFilter() {
  try {
    const res = await apiGet('/tickets/clients');
    const sel = document.getElementById('f-client');
    res.clients.forEach(c => {
      const o = document.createElement('option');
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
  } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════════════════
//  MODAL — OPEN / CLOSE / TABS
// ═══════════════════════════════════════════════════════════════════════════
function openModal() {
  editId = null;
  document.getElementById('modal-title').textContent = 'New Ticket';
  document.getElementById('save-btn').textContent    = 'Add Request';
  document.getElementById('tab-nav').style.display   = 'none';
  document.getElementById('delete-section').style.display = 'none';
  resetForm();
  switchTab('form');
  document.getElementById('overlay').classList.add('show');
}

async function openEditModal(id) {
  editId = id;
  document.getElementById('modal-title').textContent = `Edit Ticket #${id}`;
  document.getElementById('save-btn').textContent    = 'Save Changes';
  document.getElementById('tab-nav').style.display   = 'flex';
  document.getElementById('delete-section').style.display = 'block';
  switchTab('form');
  document.getElementById('overlay').classList.add('show');

  try {
    const res = await apiGet(`/tickets/${id}`);
    populateForm(res.data);
  } catch (err) {
    showToast(err.message, 'error');
    closeModal();
  }
}

function closeModal() { document.getElementById('overlay').classList.remove('show'); }

function switchTab(tab) {
  ['form','comments','log'].forEach(t => {
    document.getElementById('tab-' + t).classList.toggle('active', t === tab);
  });
  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', ['form','comments','log'][i] === tab);
  });
  if (tab === 'comments' && editId) loadComments();
  if (tab === 'log'      && editId) loadLog();
}

// ═══════════════════════════════════════════════════════════════════════════
//  FORM POPULATE & RESET
// ═══════════════════════════════════════════════════════════════════════════
function populateForm(t) {
  document.getElementById('m-name').value       = t.requester_name || '';
  document.getElementById('m-assets').value     = t.assets    || '';
  document.getElementById('m-status').value     = t.status    || 'Open';
  document.getElementById('m-site').value       = t.site      || 'Highstreet';
  document.getElementById('m-source').value     = t.source    || 'Call';
  document.getElementById('m-type').value       = t.ticket_type || '';
  document.getElementById('m-level').value      = t.level     || 'L1';
  document.getElementById('m-client').value     = t.client_name || '';
  document.getElementById('m-group').value      = t.grp       || '';
  document.getElementById('m-priority').value   = t.priority  || 'P4';
  document.getElementById('m-assignee').value   = t.assigned_to || '';
  document.getElementById('m-category').value   = t.category  || '';
  document.getElementById('m-seat').value       = t.seat_effected || '';
  document.getElementById('m-subcategory').value= t.subcategory   || '';
  document.getElementById('m-severity').value   = t.severity  || '';
  document.getElementById('m-item').value       = t.item      || '';
  document.getElementById('m-raisedby').value   = t.raised_by || '';
  document.getElementById('m-root').value       = t.root_cause || '';
  document.getElementById('m-reopened').value   = t.reopened  || '';
  document.getElementById('m-tat').value        = t.tat       ? t.tat.substring(0,10) : '';
  document.getElementById('m-remarks').value    = t.remarks   || '';
  document.getElementById('m-assigned-on').value= t.assigned_on ? t.assigned_on.substring(0,10) : '';
  document.getElementById('m-subject').value    = t.subject   || '';
  document.getElementById('m-desc').innerHTML   = t.description || '';
  clearValidationErrors();
}

function resetForm() {
  ['m-name','m-assets','m-seat','m-tat','m-remarks','m-assigned-on','m-subject','m-assignee'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('m-status').value   = 'Open';
  document.getElementById('m-site').value     = 'Highstreet';
  document.getElementById('m-source').value   = 'Call';
  document.getElementById('m-level').value    = 'L1';
  document.getElementById('m-priority').value = 'P4';
  ['m-type','m-client','m-group','m-category','m-subcategory','m-severity','m-item','m-raisedby','m-root','m-reopened']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('m-desc').innerHTML = '';
  clearValidationErrors();
}

// ═══════════════════════════════════════════════════════════════════════════
//  VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
const REQUIRED = ['name','type','client','assignee','category','severity','raisedby','reopened','subject'];

function validate() {
  let ok = true;
  REQUIRED.forEach(f => {
    const el  = document.getElementById('m-' + f);
    const err = document.getElementById('e-' + f);
    if (!el || !el.value.trim()) {
      if (err) err.style.display = 'block';
      if (el)  el.classList.add('err');
      ok = false;
    } else {
      if (err) err.style.display = 'none';
      if (el)  el.classList.remove('err');
    }
  });
  return ok;
}

function clearValidationErrors() {
  REQUIRED.forEach(f => {
    const e = document.getElementById('e-' + f);
    const i = document.getElementById('m-' + f);
    if (e) e.style.display = 'none';
    if (i) i.classList.remove('err');
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  SAVE TICKET (Create / Update)
// ═══════════════════════════════════════════════════════════════════════════
async function saveTicket() {
  if (!validate()) { showToast('Please fill in all required fields.', 'error'); return; }

  const payload = {
    requester_name: document.getElementById('m-name').value.trim(),
    assets:         document.getElementById('m-assets').value     || null,
    status:         document.getElementById('m-status').value,
    site:           document.getElementById('m-site').value,
    source:         document.getElementById('m-source').value,
    ticket_type:    document.getElementById('m-type').value,
    level:          document.getElementById('m-level').value,
    client_name:    document.getElementById('m-client').value,
    grp:            document.getElementById('m-group').value      || null,
    priority:       document.getElementById('m-priority').value,
    assigned_to:    document.getElementById('m-assignee').value   || null,
    category:       document.getElementById('m-category').value   || null,
    seat_effected:  document.getElementById('m-seat').value       || null,
    subcategory:    document.getElementById('m-subcategory').value|| null,
    severity:       document.getElementById('m-severity').value   || null,
    item:           document.getElementById('m-item').value       || null,
    raised_by:      document.getElementById('m-raisedby').value   || null,
    root_cause:     document.getElementById('m-root').value       || null,
    reopened:       document.getElementById('m-reopened').value   || 'No',
    tat:            document.getElementById('m-tat').value        || null,
    remarks:        document.getElementById('m-remarks').value    || null,
    assigned_on:    document.getElementById('m-assigned-on').value|| null,
    subject:        document.getElementById('m-subject').value.trim(),
    description:    document.getElementById('m-desc').innerHTML   || null,
  };

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    if (editId) {
      await apiPatch(`/tickets/${editId}`, payload);
      showToast(`Ticket #${editId} updated.`, 'success');
    } else {
      const res = await apiPost('/tickets', payload);
      showToast(`Ticket #${res.data.id} created.`, 'success');
    }
    closeModal();
    loadTickets();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = editId ? 'Save Changes' : 'Add Request';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  DELETE
// ═══════════════════════════════════════════════════════════════════════════
async function deleteTicket() {
  if (!editId) return;
  if (!confirm(`Delete ticket #${editId}? This cannot be undone.`)) return;
  try {
    await apiDelete(`/tickets/${editId}`);
    showToast(`Ticket #${editId} deleted.`, 'success');
    closeModal();
    loadTickets();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function quickDelete(id) {
  if (!confirm(`Delete ticket #${id}? This cannot be undone.`)) return;
  try {
    await apiDelete(`/tickets/${id}`);
    showToast(`Ticket #${id} deleted.`, 'success');
    loadTickets();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMMENTS
// ═══════════════════════════════════════════════════════════════════════════
async function loadComments() {
  const el = document.getElementById('comments-list');
  el.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const res = await apiGet(`/tickets/${editId}/comments`);
    if (!res.data.length) {
      el.innerHTML = '<div class="empty-state">No comments yet.</div>';
      return;
    }
    el.innerHTML = res.data.map(c => `
      <div class="comment-item" id="cmnt-${c.id}">
        <div class="comment-meta">
          <strong>${c.author_name}</strong>   ·   ${fmtDate(c.created_at)}
          <button class="comment-delete" onclick="removeComment(${c.id})" title="Delete">🗑</button>
        </div>
        <div class="comment-body">${c.body}</div>
      </div>
    `).join('');
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Failed to load comments: ${err.message}</div>`;
  }
}

async function submitComment() {
  const body   = document.getElementById('comment-body').value.trim();
  const author = document.getElementById('comment-author').value.trim();
  if (!body)   { showToast('Comment body cannot be empty.', 'error'); return; }
  if (!author) { showToast('Please enter your name.', 'error'); return; }
  try {
    await apiPost(`/tickets/${editId}/comments`, { body, author_name: author });
    document.getElementById('comment-body').value = '';
    loadComments();
    showToast('Comment posted.', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function removeComment(commentId) {
  if (!confirm('Delete this comment?')) return;
  try {
    await apiDelete(`/tickets/${editId}/comments/${commentId}`);
    loadComments();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════
async function loadLog() {
  const el = document.getElementById('log-list');
  el.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const res = await apiGet(`/tickets/${editId}/logs`);
    if (!res.data.length) {
      el.innerHTML = '<div class="empty-state">No audit log entries.</div>';
      return;
    }
    el.innerHTML = res.data.map(l => {
      const changesHtml = l.changes
        ? Object.entries(l.changes).map(([k, v]) =>
            `<span class="changes-color"> ${k}: <em class="old-change">${v.old||'—'}</em> → <strong>${v.new||'—'}</strong></span>`
          ).join(', ')
        : '';
      return `<div class="log-item">
        <span class="log-action">${l.action}</span>
        <span style="flex:1">${l.actor_name || 'System'}${l.note ? ' — ' + l.note : ''}${changesHtml}</span>
        <span class="log-time">${fmtDate(l.created_at)}</span>
      </div>`;
    }).join('');
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Failed to load log: ${err.message}</div>`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  EXPORT CSV
// ═══════════════════════════════════════════════════════════════════════════
async function exportCSV() {
  showToast('Preparing export…');
  try {
    // Fetch all records (high limit)
    const params = new URLSearchParams({ limit: 1000, sort_by: sortKey, sort_dir: sortDir });
    const q = document.getElementById('search').value.trim();
    if (q) params.set('search', q);
    const res = await apiGet(`/tickets?${params}`);
    const headers = ['ID','Client','Subject','Type','Priority','Severity','Requester','Status','Assigned To','Root Cause','Created'];
    const rows = res.tickets.map(t => [
      t.id, t.client_name, `"${t.subject}"`, t.ticket_type,
      t.priority, t.severity||'', t.requester_name, t.status,
      t.assigned_to||'', t.root_cause||'', fmtDate(t.created_at),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `tickets_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    showToast(`Exported ${res.tickets.length} tickets.`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  RICH TEXT
// ═══════════════════════════════════════════════════════════════════════════
function fmt(cmd) { document.getElementById('m-desc').focus(); document.execCommand(cmd, false, null); }

// ═══════════════════════════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════════════════════════
let toastTimer = null;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast ' + type;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ═══════════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════════
(async()=>{
  console.log("INIT START");
  await loadClientFilter();
  await loadTickets();
})();
