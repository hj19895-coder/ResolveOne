import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import { useMasterData } from "../../hooks/Usemasterdata";
import HtmlDescriptionEditor from "./HtmlDescriptionEditor";


// ─── Initial form state ────────────────────────────
const INITIAL_STATE = {
  requesterName:      "",
  subject:            "",
  description:        "",
  remarks:            "",
  reopened:           false,
  tat:                "",
  assignedOn:         "",
  estimatedTatHrs:    "",
  assignedToId:       "",
  statusId:           "",
  sourceId:           "",
  levelId:            "",
  groupId:            "",
  severityId:         "",
  raisedById:         "",
  siteId:             "",
  ticketTypeId:       "",
  clientNameId:       "",
  priorityId:         "",
  categoryId:         "",
  subcategoryId:      "",
  itemId:             "",
  rootCauseCategoryId: "",
};

// ─── DynamicSelect ────────────────────────────
function DynamicSelect({ label, name, type, value, onChange, required = false, placeholder = "Select..." }) {
  const { options, loading, error } = useMasterData(type);

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={loading}
        className="w-full border border-gray-200 rounded-xl px-4 py-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white hover:border-gray-300 shadow-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed appearance-none"
      >
        <option value="">
          {loading ? "Loading…" : error ? "Error loading options" : placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.value}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── TechnicianSelect ────────────────────────────
function TechnicianSelect({ label, name, value, onChange, required = false, placeholder = "Select technician..." }) {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const res = await api.get("/tickets/users");
        console.log('Edit modal technicians response:', res.data);
        const list = res.data.users || res.data || [];
        setTechnicians(Array.isArray(list) ? list : []);
      } catch (err) {
        setError(err.response?.data?.message ?? "Failed to fetch technicians");
      } finally {
        setLoading(false);
      }
    };
    fetchTechnicians();
  }, []);

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={loading}
        className="w-full border border-gray-200 rounded-xl px-4 py-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white hover:border-gray-300 shadow-sm disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed appearance-none"
      >
        <option value="">
          {loading ? "Loading…" : error ? "Error loading" : placeholder}
        </option>
        {Array.isArray(technicians) ? technicians.map((tech) => (
          <option key={tech.id} value={tech.id}>
            {tech.name}
          </option>
        )) : null}
      </select>
    </div>
  );
}

// ─── Main Modal ────────────────────────────
export default function EditTicketModal({ ticket, onClose, onUpdated }) {
  const [form, setForm] = useState(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);

  useEffect(() => {
    if (ticket) {
      setForm({
        requesterName: ticket.requesterName || "",
        subject: ticket.subject || "",
        description: ticket.description || "",
        remarks: ticket.remarks || "",
        reopened: ticket.reopened || false,
        tat: ticket.tat ? ticket.tat.slice(0, 16) : "",
        assignedOn: ticket.assignedOn ? ticket.assignedOn.slice(0, 16) : "",
        estimatedTatHrs: ticket.estimatedTatHrs?.toString() || "",
        assignedToId: ticket.assignedTo?.id || "",
        statusId: ticket.status?.id || "",
        sourceId: ticket.source?.id || "",
        levelId: ticket.level?.id || "",
        groupId: ticket.group?.id || "",
        severityId: ticket.severity?.id || "",
        raisedById: ticket.raisedBy?.id || "",
        siteId: ticket.site?.id || "",
        ticketTypeId: ticket.ticketType?.id || "",
        clientNameId: ticket.clientName?.id || "",
        priorityId: ticket.priority?.id || "",
        categoryId: ticket.category?.id || "",
        subcategoryId: ticket.subcategory?.id || "",
        itemId: ticket.item?.id || "",
        rootCauseCategoryId: ticket.rootCauseCategory?.id || "",
      });
      setRecentHistory(ticket.history || []);
    }
  }, [ticket]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleReset = () => {
    if (ticket) {
      setForm({
        requesterName: ticket.requesterName || "",
        subject: ticket.subject || "",
        description: ticket.description || "",
        remarks: ticket.remarks || "",
        reopened: ticket.reopened || false,
        tat: ticket.tat ? ticket.tat.slice(0, 16) : "",
        assignedOn: ticket.assignedOn ? ticket.assignedOn.slice(0, 16) : "",
        estimatedTatHrs: ticket.estimatedTatHrs?.toString() || "",
        assignedToId: ticket.assignedTo?.id || "",
        statusId: ticket.status?.id || "",
        sourceId: ticket.source?.id || "",
        levelId: ticket.level?.id || "",
        groupId: ticket.group?.id || "",
        severityId: ticket.severity?.id || "",
        raisedById: ticket.raisedBy?.id || "",
        siteId: ticket.site?.id || "",
        ticketTypeId: ticket.ticketType?.id || "",
        clientNameId: ticket.clientName?.id || "",
        priorityId: ticket.priority?.id || "",
        categoryId: ticket.category?.id || "",
        subcategoryId: ticket.subcategory?.id || "",
        itemId: ticket.item?.id || "",
        rootCauseCategoryId: ticket.rootCauseCategory?.id || "",
      });
    } else {
      setForm(INITIAL_STATE);
    }
    setServerError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setServerError(null);

    try {
      const res = await api.patch(`/tickets/${ticket.id}`, {
        ...form,
        assignedToId: form.assignedToId || null,
        sourceId: form.sourceId || null,
        levelId: form.levelId || null,
        groupId: form.groupId || null,
        severityId: form.severityId || null,
        raisedById: form.raisedById || null,
        siteId: form.siteId || null,
        ticketTypeId: form.ticketTypeId || null,
        clientNameId: form.clientNameId || null,
        categoryId: form.categoryId || null,
        subcategoryId: form.subcategoryId || null,
        itemId: form.itemId || null,
        rootCauseCategoryId: form.rootCauseCategoryId || null,
        estimatedTatHrs: form.estimatedTatHrs ? parseFloat(form.estimatedTatHrs) : null,
        tat: form.tat || null,
        assignedOn: form.assignedOn || null,
      });

      onUpdated(res.data);
      onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || "Failed to update ticket");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ticket) {
    return null;
  }

  const shortId = (id) => id.slice(0, 8).toUpperCase();

  const renderTextField = (label, name, type = "text", placeholder = "", required = false) => (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-200 rounded-xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white hover:border-gray-300 shadow-sm"
      />
    </div>
  );

  const renderTextarea = (label, name, rows = 3, placeholder = "", required = false) => (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="w-full resize-vertical border border-gray-200 rounded-xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white hover:border-gray-300 shadow-sm min-h-[120px]"
      />
    </div>
  );

  const dynSelect = (label, name, type, required = false, placeholder = "Select...") => (
    <DynamicSelect
      label={label}
      name={name}
      type={type}
      value={form[name]}
      onChange={handleChange}
      required={required}
      placeholder={placeholder}
    />
  );

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-md p-4 md:p-8" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300 fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-white">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Ticket</h2>
            <div className="flex items-center gap-2 text-lg text-gray-700 font-semibold">
              <span className="inline-flex px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-sm font-mono">
                #{shortId(ticket.id)}
              </span>
              <span>{ticket.subject}</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-2xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all duration-200 group"
          >
            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Recent Changes */}
        {recentHistory.length > 0 && (
          <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-b from-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Recent Changes
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {recentHistory.map((h) => (
                <div key={h.id} className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                  <span className="text-sm text-gray-700">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded-md mr-2">{h.field.replace(/Id$/, '')}</span>
                    <span className="font-mono text-xs bg-green-100 px-2 py-1 rounded-md">"{h.newValue?.slice(0,20)}..."</span>
                    <span className="text-gray-500 mx-1">←</span>
                    <span className="font-mono text-xs bg-orange-100 px-2 py-1 rounded-md">"{h.oldValue?.slice(0,20)}..."</span>
                  </span>
                  <span className="text-xs text-gray-500 font-medium">by {h.user.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Sections */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800 leading-relaxed">{serverError}</p>
              </div>
            </div>
          )}

          {/* Basic Info Section */}
          <div className="border border-gray-200 rounded-2xl shadow-sm bg-white p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Basic Information
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {renderTextField("Requester Name", "requesterName", "text", "Enter requester's full name", true)}
              {renderTextField("Subject", "subject", "text", "Brief summary of the issue", true)}
              <div className="lg:col-span-2">
                <HtmlDescriptionEditor
                  value={form.description}
                  onChange={(html) => setForm((p) => ({ ...p, description: html }))}
                  placeholder="Paste formatted text/email content here (tables supported)."
                />
              </div>
            </div>
          </div>

          {/* Assignment Section */}
          <div className="border border-gray-200 rounded-2xl shadow-sm bg-white p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Assignment
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {dynSelect("Status", "statusId", "STATUS", true, "Select current status")}
              {dynSelect("Priority", "priorityId", "PRIORITY", true, "Select priority level")}
              {dynSelect("Group", "groupId", "GROUP", false, "Select technician group")}
              <TechnicianSelect label="Assigned Technician" name="assignedToId" value={form.assignedToId} onChange={handleChange} placeholder="Select technician" />
              {dynSelect("Level", "levelId", "LEVEL", false, "Select support level")}
              {renderTextField("Assigned On", "assignedOn", "datetime-local", "Assignment date & time")}
            </div>
          </div>

          {/* Additional Details Section */}
          <div className="border border-gray-200 rounded-2xl shadow-sm bg-white p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Additional Details
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {renderTextarea("Remarks", "remarks", 4, "Additional notes or comments")}
              {renderTextField("Estimated TAT (hours)", "estimatedTatHrs", "number", "Estimated resolution time")}
              {dynSelect("Category", "categoryId", "CATEGORY", false, "Select category")}
              {dynSelect("Source", "sourceId", "SOURCE", false, "Select source")}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 px-8 py-6 border-t border-gray-200 bg-gradient-to-r from-gray-50">
          <button 
            type="button" 
            onClick={handleReset} 
            className="px-6 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl font-semibold hover:bg-gray-50 hover:shadow-sm transition-all duration-200 text-sm shadow-sm"
          >
            Reset
          </button>
          <button 
            type="button" 
            onClick={onClose} 
            className="px-6 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl font-semibold hover:bg-gray-50 hover:shadow-sm transition-all duration-200 text-sm shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 rounded-full border-b-2 border-white" viewBox="0 24 24" />
                Saving Changes
              </>
            ) : "Update Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}

