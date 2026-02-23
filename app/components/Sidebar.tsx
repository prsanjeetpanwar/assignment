"use client";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import ThemeToggle from "@/app/components/ThemeToggle";

type ConvexUser = {
  _id: Id<"users">;
  name: string;
  email: string;
  imageUrl?: string;
  isOnline: boolean;
  clerkId: string;
};

type Conversation = {
  _id: Id<"conversations">;
  participants: Id<"users">[];
  lastMessage?: string;
  lastMessageTime?: number;
  otherUser?: ConvexUser;
  unreadCount: number;
};

interface SidebarProps {
  onSelectConversation: (
    conversationId: Id<"conversations"> | null,
    otherUser: ConvexUser
  ) => void;
  selectedConversationId: Id<"conversations"> | null;
}

export default function Sidebar({
  onSelectConversation,
  selectedConversationId,
}: SidebarProps) {
  const { user } = useUser();
  const [search, setSearch] = useState("");

  const currentUser = useQuery(api.users.getUserByClerkId, {
    clerkId: user?.id ?? "",
  });

  const allUsers = useQuery(api.users.getAllUsers, {
    clerkId: user?.id ?? "",
  });

  const conversations = useQuery(
    api.conversations.getUserConversations,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );

  const filtered = allUsers?.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-card border-r border-border">

      {/* ── HEADER ── */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-xl text-foreground tracking-tight">
            Messages
          </h2>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2 focus-within:border-[#5B4FD4] focus-within:ring-1 focus-within:ring-[#5B4FD4]/20 transition-all">
          <svg
            width="13" height="13" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            className="text-muted-foreground flex-shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="bg-transparent outline-none text-sm text-foreground w-full placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── LIST ── */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-border">

        {/* SEARCH RESULTS */}
        {search ? (
          <>
            {filtered?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-muted-foreground text-sm font-medium">
                  No users found
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Try a different name
                </p>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-2">
                  People
                </p>
                {filtered?.map((u) => (
                  <UserItem
                    key={u._id}
                    user={u as ConvexUser}
                    onSelect={onSelectConversation}
                  />
                ))}
              </>
            )}
          </>
        ) : (
          /* CONVERSATIONS */
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-2">
              Conversations
            </p>

            {conversations === undefined ? (
              // Loading skeletons
              <div className="space-y-1 px-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                    <div className="w-11 h-11 rounded-full bg-secondary animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-secondary animate-pulse rounded-full w-28" />
                      <div className="h-3 bg-secondary animate-pulse rounded-full w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-muted-foreground font-semibold text-sm">
                  No conversations yet
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Search for a user to start chatting
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv._id}
                  conv={conv as Conversation}
                  onSelect={onSelectConversation}
                  isSelected={selectedConversationId === conv._id}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── USER ITEM (search result) ── */
function UserItem({
  user,
  onSelect,
}: {
  user: ConvexUser;
  onSelect: (id: null, user: ConvexUser) => void;
}) {
  return (
    <div
      onClick={() => onSelect(null, user)}
      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-secondary transition-colors"
    >
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5B4FD4] to-[#7C6FF5] flex items-center justify-center text-white font-bold text-sm overflow-hidden">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            user.name[0].toUpperCase()
          )}
        </div>
        <div
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
            user.isOnline ? "bg-green-500" : "bg-muted-foreground/30"
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {user.name}
        </p>
        <p className={`text-xs font-medium ${user.isOnline ? "text-green-500" : "text-muted-foreground"}`}>
          {user.isOnline ? "● Online" : "● Offline"}
        </p>
      </div>
      {/* Start chat arrow */}
      <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0">
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

/* ── CONVERSATION ITEM ── */
function ConversationItem({
  conv,
  onSelect,
  isSelected,
}: {
  conv: Conversation;
  onSelect: (id: Id<"conversations">, user: ConvexUser) => void;
  isSelected: boolean;
}) {
  const otherUser = conv.otherUser;
  if (!otherUser) return null;

  const unreadCount = conv.unreadCount ?? 0;

  // Format last message time
  const formatTime = (ts?: number) => {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div
      onClick={() => onSelect(conv._id, otherUser)}
      className={`
        flex items-center gap-3 p-3 rounded-xl cursor-pointer
        transition-all duration-150 border
        ${isSelected
          ? "bg-[#5B4FD4]/10 border-[#5B4FD4]/20"
          : "border-transparent hover:bg-secondary"
        }
      `}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#5B4FD4] to-[#7C6FF5] flex items-center justify-center text-white font-bold text-sm overflow-hidden">
          {otherUser.imageUrl ? (
            <img
              src={otherUser.imageUrl}
              alt={otherUser.name}
              className="w-full h-full object-cover"
            />
          ) : (
            otherUser.name[0].toUpperCase()
          )}
        </div>
        <div
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
            otherUser.isOnline ? "bg-green-500" : "bg-muted-foreground/30"
          }`}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${
          isSelected ? "text-[#5B4FD4]" : "text-foreground"
        }`}>
          {otherUser.name}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {conv.lastMessage ?? "No messages yet"}
        </p>
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {conv.lastMessageTime && (
          <p className="text-[10px] text-muted-foreground font-medium">
            {formatTime(conv.lastMessageTime)}
          </p>
        )}
        {unreadCount > 0 && (
          <span className="bg-[#5B4FD4] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center leading-4">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>
    </div>
  );
}