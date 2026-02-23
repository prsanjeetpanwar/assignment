"use client";

interface Props {
  fileUrl: string;
  fileName?: string;
  fileType?: string;
  isOwn: boolean;
}

export default function MessageFile({ fileUrl, fileName, fileType, isOwn }: Props) {
  if (fileType === "image") {
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
        <img
          src={fileUrl}
          alt={fileName ?? "Image"}
          className="
            max-w-[260px] max-h-[200px] rounded-2xl object-cover
            cursor-pointer hover:opacity-90 transition-opacity shadow-md
          "
        />
      </a>
    );
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={fileName}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-2xl
        border transition-all hover:opacity-80 no-underline
        ${isOwn
          ? "bg-white/15 border-white/20 text-white"
          : "bg-secondary border-border text-foreground"
        }
      `}
    >
      <div className={`
        w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
        ${isOwn ? "bg-white/20" : "bg-[#5B4FD4]/10"}
      `}>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"
          stroke={isOwn ? "white" : "#5B4FD4"} strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{fileName ?? "File"}</p>
        <p className={`text-xs ${isOwn ? "text-white/70" : "text-muted-foreground"}`}>
          Click to download
        </p>
      </div>

      <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
        stroke={isOwn ? "white" : "currentColor"} strokeWidth="2"
        className={isOwn ? "" : "text-muted-foreground"}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </a>
  );
}