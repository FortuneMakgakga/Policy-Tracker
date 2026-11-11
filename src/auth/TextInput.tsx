import React from "react";

interface TextInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

export default function TextInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
}: TextInputProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-black mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-black/10 bg-[#f6f6f6] px-4 py-3 text-black placeholder:text-[#9a9a9a] focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/20 focus:bg-white transition-colors"
      />
    </div>
  );
}
