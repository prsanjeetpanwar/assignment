"use client";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

// shadcn/ui
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// lucide-react
import { Search, X, Users, Check, Hash } from "lucide-react";

type ConvexUser = {
  _id: Id<"users">;
  name: string;
  email: string;
  imageUrl?: string;
  isOnline: boolean;
  clerkId: string;
};

interface CreateGroupModalProps {
  allUsers: ConvexUser[];
  onClose: () => void;
  onCreate: (groupName: string, memberIds: Id<"users">[]) => void;
}

const MEMBER_GRADIENTS = [
  "from-pink-400 to-rose-500",
  "from-violet-400 to-purple-600",
  "from-blue-400 to-cyan-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-fuchsia-400 to-pink-600",
];

function getMemberGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return MEMBER_GRADIENTS[Math.abs(hash) % MEMBER_GRADIENTS.length];
}

export default function CreateGroupModal({ allUsers, onClose, onCreate }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<Id<"users">[]>([]);
  const [search, setSearch] = useState("");

  const filtered = allUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: Id<"users">) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!groupName.trim() || selected.length < 1) return;
    onCreate(groupName.trim(), selected);
  };

  const canCreate = groupName.trim().length > 0 && selected.length >= 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5B4FD4] to-[#7C6FF5] flex items-center justify-center shadow-sm shadow-[#5B4FD4]/30">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm leading-tight">New Group Chat</h2>
              <p className="text-[10px] text-muted-foreground">Add a name &amp; select members</p>
            </div>
          </div>
          {/* ✅ shadcn Button */}
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
            onClick={onClose}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="p-5 space-y-4">

          {/* ── GROUP NAME ── */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Hash className="w-3 h-3" />
              Group Name
            </label>
            <div className="relative">
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Team Alpha, Weekend Plans..."
                className="h-10 bg-secondary border-border rounded-xl text-sm focus-visible:ring-[#5B4FD4]/20 focus-visible:border-[#5B4FD4] pr-9"
              />
              {groupName && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#5B4FD4] flex items-center justify-center pointer-events-none">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* ── SELECTED CHIPS ── */}
          {selected.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Check className="w-3 h-3" />
                Selected ({selected.length})
              </label>
              <div className="flex flex-wrap gap-1.5">
                {selected.map((id) => {
                  const u = allUsers.find((x) => x._id === id);
                  if (!u) return null;
                  const gradient = getMemberGradient(u.name);
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 h-auto rounded-full bg-[#5B4FD4]/10 text-[#5B4FD4] border border-[#5B4FD4]/20 font-semibold text-xs"
                    >
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-[8px] font-bold overflow-hidden flex-shrink-0`}>
                        {u.imageUrl ? (
                          <img src={u.imageUrl} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          u.name[0].toUpperCase()
                        )}
                      </div>
                      <span>{u.name}</span>
                      {/* ✅ shadcn Button for chip remove */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-4 h-4 rounded-full bg-[#5B4FD4]/20 hover:bg-[#5B4FD4]/50 text-[#5B4FD4] hover:text-white ml-0.5 flex-shrink-0 transition-colors"
                        onClick={() => toggle(id)}
                      >
                        <X className="w-2.5 h-2.5" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
              <Separator />
            </div>
          )}

          {/* ── ADD MEMBERS ── */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              Add Members
            </label>

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="pl-8 pr-8 h-9 bg-secondary border-border rounded-xl text-sm focus-visible:ring-[#5B4FD4]/20 focus-visible:border-[#5B4FD4]"
              />
              {search && (
                // ✅ shadcn Button for clear search
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={() => setSearch("")}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* User list */}
            <ScrollArea className="h-44 rounded-xl border border-border bg-secondary/30">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-44 gap-2">
                  <Search className="w-6 h-6 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground font-medium">No users found</p>
                </div>
              ) : (
                <div>
                  {filtered.map((u, i) => {
                    const isSelected = selected.includes(u._id);
                    const gradient = getMemberGradient(u.name);
                    return (
                      <div key={u._id}>
                        {i > 0 && <Separator />}
                        {/* ✅ shadcn Button for each user row */}
                        <Button
                          variant="ghost"
                          onClick={() => toggle(u._id)}
                          className={`w-full h-auto flex items-center gap-3 px-3 py-2.5 rounded-none justify-start transition-colors group ${
                            isSelected
                              ? "bg-[#5B4FD4]/10 hover:bg-[#5B4FD4]/15"
                              : "hover:bg-secondary/80"
                          }`}
                        >
                          {/* Avatar with online dot */}
                          <div className="relative flex-shrink-0">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold overflow-hidden shadow-sm ring-2 transition-all ${
                              isSelected ? "ring-[#5B4FD4]/40" : "ring-transparent"
                            }`}>
                              {u.imageUrl ? (
                                <img src={u.imageUrl} alt={u.name} className="w-full h-full object-cover" />
                              ) : (
                                u.name[0].toUpperCase()
                              )}
                            </div>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                              u.isOnline ? "bg-green-500" : "bg-muted-foreground/30"
                            }`} />
                          </div>

                          {/* Name + status */}
                          <div className="flex-1 min-w-0 text-left">
                            <p className={`text-sm font-semibold truncate ${
                              isSelected ? "text-[#5B4FD4]" : "text-foreground"
                            }`}>
                              {u.name}
                            </p>
                            <p className={`text-xs font-medium ${
                              u.isOnline ? "text-green-500" : "text-muted-foreground"
                            }`}>
                              {u.isOnline ? "● Online" : "● Offline"}
                            </p>
                          </div>

                          {/* Checkbox indicator */}
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected
                              ? "bg-[#5B4FD4] border-[#5B4FD4] shadow-sm shadow-[#5B4FD4]/40"
                              : "border-border group-hover:border-[#5B4FD4]/40"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                          </div>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="px-5 pb-5 flex gap-3">
          {/* ✅ shadcn Button — Cancel */}
          <Button
            variant="outline"
            className="flex-1 rounded-xl h-10 text-sm font-semibold"
            onClick={onClose}
          >
            Cancel
          </Button>
          {/* ✅ shadcn Button — Create */}
          <Button
            onClick={handleCreate}
            disabled={!canCreate}
            className="flex-1 rounded-xl h-10 text-sm font-bold bg-[#5B4FD4] hover:bg-[#4a3fc7] text-white shadow-md shadow-[#5B4FD4]/25 disabled:shadow-none gap-2"
          >
            <Users className="w-3.5 h-3.5" />
            {selected.length > 0
              ? `Create · ${selected.length} member${selected.length > 1 ? "s" : ""}`
              : "Create Group"}
          </Button>
        </div>
      </div>
    </div>
  );
}