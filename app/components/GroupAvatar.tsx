"use client";

// Generates a deterministic but beautiful gradient + emoji combo from group name
const GRADIENT_PALETTES = [
  { from: "#FF6B6B", to: "#FFE66D", emoji: "🔥" },
  { from: "#4ECDC4", to: "#44A08D", emoji: "🌊" },
  { from: "#A18CD1", to: "#FBC2EB", emoji: "✨" },
  { from: "#F093FB", to: "#F5576C", emoji: "💜" },
  { from: "#4FACFE", to: "#00F2FE", emoji: "❄️" },
  { from: "#43E97B", to: "#38F9D7", emoji: "🌿" },
  { from: "#FA709A", to: "#FEE140", emoji: "🌸" },
  { from: "#A1C4FD", to: "#C2E9FB", emoji: "🌌" },
  { from: "#FD746C", to: "#FF9068", emoji: "🍊" },
  { from: "#667EEA", to: "#764BA2", emoji: "🔮" },
  { from: "#F7971E", to: "#FFD200", emoji: "⚡" },
  { from: "#56CCF2", to: "#2F80ED", emoji: "🌀" },
  { from: "#11998E", to: "#38EF7D", emoji: "🐉" },
  { from: "#EB3349", to: "#F45C43", emoji: "🎯" },
  { from: "#C94B4B", to: "#4B134F", emoji: "🎭" },
  { from: "#0F2027", to: "#78FFD6", emoji: "🌙" },
];

export function getGroupStyle(groupName: string) {
  // Deterministic hash from name
  let hash = 0;
  for (let i = 0; i < groupName.length; i++) {
    hash = groupName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENT_PALETTES.length;
  return GRADIENT_PALETTES[index];
}

interface GroupAvatarProps {
  groupName: string;
  size?: "sm" | "md" | "lg";
  showRing?: boolean;
}

export default function GroupAvatar({ groupName, size = "md", showRing = false }: GroupAvatarProps) {
  const style = getGroupStyle(groupName);

  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-xl",
  };

  return (
    <div
      className={`
        ${sizeClasses[size]} rounded-full flex items-center justify-center
        flex-shrink-0 relative
        ${showRing ? "ring-2 ring-offset-2 ring-offset-card" : ""}
      `}
      style={{
        background: `linear-gradient(135deg, ${style.from}, ${style.to})`,
        boxShadow: `0 2px 12px ${style.from}55`,
        ...(showRing ? { ringColor: style.from } : {}),
      }}
    >
      <span className="leading-none select-none">{style.emoji}</span>
    </div>
  );
}