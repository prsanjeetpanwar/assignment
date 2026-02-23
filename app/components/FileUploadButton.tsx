"use client";
import { useRef } from "react";

interface Props {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export default function FileUploadButton({ onFileSelect, disabled }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onFileSelect(file);
            e.target.value = "";
          }
        }}
      />
      <button
        type="button"
        disabled={disabled}
        title="Attach file"
        onClick={() => ref.current?.click()}
        className="
          w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
          bg-secondary border border-border text-muted-foreground
          hover:bg-[#5B4FD4]/10 hover:text-[#5B4FD4] hover:border-[#5B4FD4]/20
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-150
        "
      >
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth="2">
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
    </>
  );
}