"use client";

interface Props {
  file: File;
  onRemove: () => void;
}

export default function FilePreview({ file, onRemove }: Props) {
  const isImage = file.type.startsWith("image/");
  const previewUrl = isImage ? URL.createObjectURL(file) : null;
  const sizeKB = (file.size / 1024).toFixed(1);

  return (
    <div className="
      absolute bottom-full left-4 mb-2 z-20
      bg-card border border-border
      rounded-2xl p-3 shadow-lg
      flex items-center gap-3 max-w-xs
    ">
      {isImage && previewUrl ? (
        <img
          src={previewUrl}
          alt={file.name}
          className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-[#5B4FD4]/10 flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"
            stroke="#5B4FD4" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{sizeKB} KB</p>
      </div>

      <button
        onClick={onRemove}
        title="Remove"
        className="
          w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
          bg-destructive/10 text-destructive
          hover:bg-destructive/20 transition-colors
        "
      >
        <svg width="10" height="10" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}