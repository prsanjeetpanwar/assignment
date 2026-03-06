"use client";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import ThemeToggle from "@/app/components/ThemeToggle";
import CreateGroupModal from "@/app/components/CreateGroup";
import GroupAvatar from "@/app/components/GroupAvatar";

// shadcn/ui imports
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// lucide-react icons
import { Search, X, Users } from "lucide-react";

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
  otherUser?: ConvexUser | null;
  members?: ConvexUser[] | null;
  unreadCount: number;
  isGroup?: boolean;
  groupName?: string;
};

interface SidebarProps {
  onSelectConversation: (
    conversationId: Id<"conversations"> | null,
    otherUser: ConvexUser | null,
    isGroup?: boolean,
    groupName?: string,
    members?: ConvexUser[]
  ) => void;
  selectedConversationId: Id<"conversations"> | null;
}

export default function Sidebar({ onSelectConversation, selectedConversationId }: SidebarProps) {
  const { user } = useUser();
  const [search, setSearch] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);

  const currentUser = useQuery(api.users.getUserByClerkId, { clerkId: user?.id ?? "" });
  const allUsers = useQuery(api.users.getAllUsers, { clerkId: user?.id ?? "" });
  const conversations = useQuery(
    api.conversations.getUserConversations,
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );
  const createGroup = useMutation(api.conversations.createGroupConversation);

  const filtered = allUsers?.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateGroup = async (groupName: string, memberIds: Id<"users">[]) => {
    if (!currentUser) return;
    const convId = await createGroup({ creatorId: currentUser._id, memberIds, groupName });
    const members = allUsers?.filter((u) => memberIds.includes(u._id)) ?? [];
    setShowGroupModal(false);
    onSelectConversation(convId, null, true, groupName, members as ConvexUser[]);
  };

  return (
    <TooltipProvider>
      {showGroupModal && allUsers && (
        <CreateGroupModal
          allUsers={allUsers as ConvexUser[]}
          onClose={() => setShowGroupModal(false)}
          onCreate={handleCreateGroup}
        />
      )}

      <div className="w-full h-full flex flex-col bg-card border-r border-border">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-xl text-foreground tracking-tight">Messages</h2>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-8 h-8 rounded-lg hover:bg-[#5B4FD4]/10 hover:text-[#5B4FD4] hover:border-[#5B4FD4]/20"
                    onClick={() => setShowGroupModal(true)}
                  >
                    <Users className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Group</TooltipContent>
              </Tooltip>
              <ThemeToggle />
              <UserButton />
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-8 pr-8 h-9 bg-secondary border-border rounded-xl text-sm focus-visible:ring-[#5B4FD4]/20 focus-visible:border-[#5B4FD4]"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {search ? (
              <>
                {filtered?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="text-3xl mb-2">🔍</div>
                    <p className="text-muted-foreground text-sm font-medium">No users found</p>
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
                        onSelect={(user) => onSelectConversation(null, user)}
                      />
                    ))}
                  </>
                )}
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-2">
                  Conversations
                </p>
                {conversations === undefined ? (
                  <div className="space-y-1 px-1">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                        <Skeleton className="w-11 h-11 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-28 rounded-full" />
                          <Skeleton className="h-3 w-20 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="text-4xl mb-3">💬</div>
                    <p className="text-muted-foreground font-semibold text-sm">No conversations yet</p>
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
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}

function UserItem({ user, onSelect }: { user: ConvexUser; onSelect: (user: ConvexUser) => void }) {
  return (
    <div
      onClick={() => onSelect(user)}
      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-secondary transition-colors"
    >
      <div className="relative flex-shrink-0">
        <Avatar className="w-10 h-10">
          <AvatarImage src={user.imageUrl} alt={user.name} />
          <AvatarFallback className="bg-gradient-to-br from-[#5B4FD4] to-[#7C6FF5] text-white font-bold text-sm">
            {user.name[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
            user.isOnline ? "bg-green-500" : "bg-muted-foreground/30"
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
        <p className={`text-xs font-medium ${user.isOnline ? "text-green-500" : "text-muted-foreground"}`}>
          {user.isOnline ? "● Online" : "● Offline"}
        </p>
      </div>
    </div>
  );
}

function ConversationItem({
  conv,
  onSelect,
  isSelected,
}: {
  conv: Conversation;
  onSelect: (
    id: Id<"conversations">,
    user: ConvexUser | null,
    isGroup?: boolean,
    groupName?: string,
    members?: ConvexUser[]
  ) => void;
  isSelected: boolean;
}) {
  const formatTime = (ts?: number) => {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    if (date.toDateString() === now.toDateString())
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const handleClick = () => {
    if (conv.isGroup) onSelect(conv._id, null, true, conv.groupName, conv.members as ConvexUser[]);
    else onSelect(conv._id, conv.otherUser as ConvexUser, false);
  };

  const displayName = conv.isGroup ? conv.groupName ?? "Group" : conv.otherUser?.name ?? "Unknown";
  const subText = conv.isGroup
    ? `${conv.participants?.length ?? 0} members`
    : conv.otherUser?.isOnline
    ? "● Online"
    : "● Offline";
  const subColor = !conv.isGroup && conv.otherUser?.isOnline ? "text-green-500" : "text-muted-foreground";

  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150 border
        ${isSelected ? "bg-[#5B4FD4]/10 border-[#5B4FD4]/20" : "border-transparent hover:bg-secondary"}`}
    >
      {conv.isGroup ? (
        <GroupAvatar groupName={conv.groupName ?? "Group"} size="md" />
      ) : (
        <div className="relative flex-shrink-0">
          <Avatar className="w-11 h-11">
            <AvatarImage src={conv.otherUser?.imageUrl} alt={conv.otherUser?.name} />
            <AvatarFallback className="bg-gradient-to-br from-[#5B4FD4] to-[#7C6FF5] text-white font-bold text-sm">
              {conv.otherUser?.name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
              conv.otherUser?.isOnline ? "bg-green-500" : "bg-muted-foreground/30"
            }`}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isSelected ? "text-[#5B4FD4]" : "text-foreground"}`}>
          {displayName}
        </p>
        <p className={`text-xs truncate mt-0.5 ${subColor}`}>{conv.lastMessage ?? subText}</p>
      </div>

      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {conv.lastMessageTime && (
          <p className="text-[10px] text-muted-foreground font-medium">{formatTime(conv.lastMessageTime)}</p>
        )}
        {(conv.unreadCount ?? 0) > 0 && (
          <Badge
            className="bg-[#5B4FD4] hover:bg-[#5B4FD4] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center leading-4 h-auto"
          >
            {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
          </Badge>
        )}
      </div>
    </div>
  );
}