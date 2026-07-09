import React from "react";

export default function FormSelect({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  error = "",
  placeholder = "Select…",
}) {
  return (
    <div className="flex flex-col">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className={`w-full appearance-none border rounded-lg px-3 py-2 pr-9 text-sm outline-none transition
            focus:border-blue-500 focus:ring-2 focus:ring-blue-100
            ${error ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"}`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
          ▼
        </span>
      </div>
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
}

