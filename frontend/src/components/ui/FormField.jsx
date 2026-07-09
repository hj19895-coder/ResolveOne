import React from "react";

export default function FormField({
  label,
  name,
  value,
  onChange,
  placeholder = "",
  type = "text",
  required = false,
  error = "",
  maxLength,
}) {
  return (
    <div className="flex flex-col">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition
          focus:border-blue-500 focus:ring-2 focus:ring-blue-100
          ${error ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"}`}
      />
      {error && <span className="text-xs text-red-500 mt-1">{error}</span>}
    </div>
  );
}

