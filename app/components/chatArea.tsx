"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import FileUploadButton from "@/app/components/FileUploadButton";
import FilePreview from "@/app/components/FilePreview";
import MessageFile from "@/app/components/MessageFIle";
import GroupAvatar, { getGroupStyle } from "@/app/components/GroupAvatar";

// shadcn/ui
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// lucide-react
import {
  ArrowLeft,
  Phone,
  MoreVertical,
  SmilePlus,
  Send,
  Loader2,
  ChevronDown,
  Users,
  CheckCheck,
  Trash2,
  AlertCircle,  // ← new
  RotateCcw,    // ← new
  X,            // ← new
} from "lucide-react";

type ConvexUser = {
  _id: Id<"users">;
  name: string;
  email: string;
  imageUrl?: string;
  isOnline: boolean;
  clerkId: string;
};

interface ChatAreaProps {
  conversationId: Id<"conversations">;
  otherUser: ConvexUser | null;
  currentUser: ConvexUser;
  onBack: () => void;
  isGroup?: boolean;
  groupName?: string;
  groupMembers?: ConvexUser[];
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isToday) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isThisYear)
    return (
      date.toLocaleDateString([], { month: "short", day: "numeric" }) +
      ", " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

function isNewDay(current: number, previous: number) {
  return new Date(current).toDateString() !== new Date(previous).toDateString();
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

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

function MemberAvatar({ user, size = "sm" }: { user: ConvexUser; size?: "sm" | "xs" }) {
  const gradient = getMemberGradient(user.name);
  const sz = size === "xs" ? "w-5 h-5 text-[8px]" : "w-7 h-7 text-[10px]";
  return (
    <div className={`${sz} rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden ring-1 ring-white/10`}>
      {user.imageUrl ? (
        <img src={user.imageUrl} alt={user.name} className="w-full h-full object-cover" />
      ) : (
        user.name[0].toUpperCase()
      )}
    </div>
  );
}

export default function ChatArea({
  conversationId,
  otherUser,
  currentUser,
  onBack,
  isGroup = false,
  groupName,
  groupMembers = [],
}: ChatAreaProps) {
  const { resolvedTheme } = useTheme();

  const [input, setInput] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<Id<"messages"> | null>(null);
  const [showMembers, setShowMembers] = useState(false);

  // ── NEW: error retry state ──
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [failedFile, setFailedFile] = useState<File | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = useQuery(api.messages.getMessages, { conversationId });
  const sendMessage = useMutation(api.messages.sendMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const clearUnread = useMutation(api.messages.clearUnread);
  const setTyping = useMutation(api.presence.setTyping);
  const toggleReaction = useMutation(api.messages.toggleReaction);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

  const typingUsers = useQuery(api.conversations.getTypingUsers, {
    conversationId,
    currentUserId: currentUser._id,
  });

  useEffect(() => {
    clearUnread({ conversationId, userId: currentUser._id });
  }, [conversationId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowNewMsg(false);
    } else {
      setShowNewMsg(true);
    }
  }, [messages]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
        setReactionPickerMsgId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowNewMsg(false);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setTyping({ conversationId, userId: currentUser._id, isTyping: true });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setTyping({ conversationId, userId: currentUser._id, isTyping: false });
    }, 2000);
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 10 * 1024 * 1024) { alert("File too large. Max size is 10MB."); return; }
    setPendingFile(file);
    // clear previous error when user picks a new file
    setFailedMessage(null);
    setFailedFile(null);
  };

  // ── Core send logic — shared by handleSend and handleRetry ──
  const executeSend = async (textContent: string, fileToSend?: File | null) => {
    setIsUploading(true);
    setFailedMessage(null);
    setFailedFile(null);

    try {
      let fileId: string | undefined, fileName: string | undefined, fileType: string | undefined;

      if (fileToSend) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": fileToSend.type },
          body: fileToSend,
        });
        const { storageId } = await result.json();
        fileId = storageId;
        fileName = fileToSend.name;
        fileType = fileToSend.type.startsWith("image/") ? "image" : "file";
        setPendingFile(null);
      }

      const content = textContent.trim() || (fileType === "image" ? "📷 Photo" : `📎 ${fileName}`);
      setInput("");
      setShowEmojiPicker(false);
      setTyping({ conversationId, userId: currentUser._id, isTyping: false });

      await sendMessage({
        conversationId,
        senderId: currentUser._id,
        content,
        fileId,
        fileName,
        fileType,
      });

      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Send failed:", err);
      // ── Save what failed so user can retry ──
      setFailedMessage(textContent || null);
      setFailedFile(fileToSend ?? null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !pendingFile) return;
    await executeSend(input.trim(), pendingFile);
  };

  // ── Retry: resend exactly what failed ──
  const handleRetry = async () => {
    const text = failedMessage ?? "";
    const file = failedFile;
    if (text) setInput(text);
    if (file) setPendingFile(file);
    await executeSend(text, file);
  };

  const handleDismissError = () => {
    setFailedMessage(null);
    setFailedFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) handleSend();
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInput((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const onReactionEmojiClick = (emojiData: EmojiClickData, msgId: Id<"messages">) => {
    toggleReaction({ messageId: msgId, userId: currentUser._id, emoji: emojiData.emoji });
    setReactionPickerMsgId(null);
  };

  const getMember = (senderId: Id<"users">) => groupMembers.find((m) => m._id === senderId);
  const getSenderName = (senderId: Id<"users">) => getMember(senderId)?.name ?? "Unknown";

  const emojiTheme = resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT;
  const groupStyle = isGroup && groupName ? getGroupStyle(groupName) : null;

  if (messages === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            {[0, 150, 300].map((delay) => (
              <span key={delay} className="w-2.5 h-2.5 bg-[#5B4FD4] rounded-full animate-bounce"
                style={{ animationDelay: `${delay}ms` }} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground font-medium">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full w-full bg-background relative">

        {/* ── HEADER ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm shadow-sm z-10 sticky top-0">
          <Button variant="ghost" size="icon"
            className="md:hidden w-8 h-8 rounded-xl hover:bg-accent flex-shrink-0"
            onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>

          {isGroup ? (
            <GroupAvatar groupName={groupName ?? "Group"} size="md" showRing />
          ) : (
            <div className="relative flex-shrink-0">
              <Avatar className="w-10 h-10 ring-2 ring-[#5B4FD4]/20">
                <AvatarImage src={otherUser?.imageUrl} alt={otherUser?.name} />
                <AvatarFallback className="bg-gradient-to-br from-[#5B4FD4] to-[#7C6FF5] text-white font-bold text-sm">
                  {otherUser?.name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${otherUser?.isOnline ? "bg-green-500" : "bg-muted-foreground/30"}`} />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-sm leading-tight truncate">
              {isGroup ? groupName : otherUser?.name}
            </p>
            {isGroup ? (
              <button onClick={() => setShowMembers(!showMembers)}
                className="flex items-center gap-1.5 mt-0.5 hover:opacity-80 transition-opacity">
                <div className="flex -space-x-1.5">
                  {groupMembers.slice(0, 4).map((m) => <MemberAvatar key={m._id} user={m} size="xs" />)}
                  {groupMembers.length > 4 && (
                    <div className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                      +{groupMembers.length - 4}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {groupMembers.length + 1} members
                </span>
              </button>
            ) : (
              <p className={`text-xs font-medium ${otherUser?.isOnline ? "text-green-500" : "text-muted-foreground"}`}>
                {otherUser?.isOnline ? "● Active now" : "● Offline"}
              </p>
            )}
          </div>

          <div className="flex gap-1.5">
            {!isGroup && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon"
                    className="w-8 h-8 rounded-xl hover:bg-[#5B4FD4]/10 hover:text-[#5B4FD4] hover:border-[#5B4FD4]/30">
                    <Phone className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Voice Call</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon"
                  className="w-8 h-8 rounded-xl hover:bg-[#5B4FD4]/10 hover:text-[#5B4FD4] hover:border-[#5B4FD4]/30">
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>More Options</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ── MEMBERS PANEL ── */}
        {isGroup && showMembers && (
          <div className="border-b border-border bg-secondary/40 px-5 py-3">
            <div className="flex items-center gap-2 mb-2.5">
              <Users className="w-3 h-3 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Members</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 bg-[#5B4FD4]/10 border border-[#5B4FD4]/20 rounded-full px-2.5 py-1">
                <Avatar className="w-4 h-4">
                  <AvatarImage src={currentUser.imageUrl} />
                  <AvatarFallback className="bg-gradient-to-br from-[#5B4FD4] to-[#7C6FF5] text-white text-[8px] font-bold">
                    {currentUser.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold text-foreground">{currentUser.name}</span>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-[#5B4FD4]/20 text-[#5B4FD4] border-0">
                  you
                </Badge>
              </div>
              {groupMembers.map((m) => (
                <div key={m._id} className="flex items-center gap-1.5 bg-card border border-border rounded-full px-2.5 py-1">
                  <MemberAvatar user={m} size="xs" />
                  <span className="text-xs font-medium text-foreground">{m.name}</span>
                  {m.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MESSAGES ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              {isGroup && groupName ? (
                <>
                  <GroupAvatar groupName={groupName} size="lg" />
                  <div>
                    <p className="text-foreground font-bold text-lg">{groupName}</p>
                    <p className="text-muted-foreground text-sm mt-1">{groupMembers.length + 1} members · Start the conversation!</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5B4FD4]/20 to-[#7C6FF5]/10 border border-[#5B4FD4]/20 flex items-center justify-center text-3xl">
                    👋
                  </div>
                  <div>
                    <p className="text-foreground font-bold">No messages yet</p>
                    <p className="text-muted-foreground text-sm mt-1">Say hi to {otherUser?.name}!</p>
                  </div>
                </>
              )}
            </div>
          )}

          {messages.map((msg, i) => {
            const isOwn = msg.senderId === currentUser._id;
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const showDay = !prev || isNewDay(msg._creationTime, prev._creationTime);
            const showSenderName = isGroup && !isOwn && (!prev || prev.senderId !== msg.senderId);
            const isLastInGroup = !next || next.senderId !== msg.senderId || isNewDay(msg._creationTime, next._creationTime);
            const sender = isGroup && !isOwn ? getMember(msg.senderId) : null;

            return (
              <div key={msg._id}>
                {showDay && (
                  <div className="flex items-center gap-3 my-5">
                    <Separator className="flex-1" />
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest whitespace-nowrap bg-background px-2.5 py-1 rounded-full border border-border">
                      {new Date(msg._creationTime).toDateString() === new Date().toDateString()
                        ? "Today"
                        : new Date(msg._creationTime).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <Separator className="flex-1" />
                  </div>
                )}

                <div className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""} ${isLastInGroup ? "mb-3" : "mb-0.5"}`}>
                  {!isOwn && (
                    <div className="flex-shrink-0 w-7">
                      {isLastInGroup && (
                        isGroup && sender ? (
                          <MemberAvatar user={sender} size="sm" />
                        ) : (
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={otherUser?.imageUrl} alt={otherUser?.name} />
                            <AvatarFallback className="bg-gradient-to-br from-[#5B4FD4] to-[#7C6FF5] text-white text-[10px] font-bold">
                              {otherUser?.name[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )
                      )}
                    </div>
                  )}

                  <div className={`max-w-[65%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                    {showSenderName && (
                      <span className="text-[10px] font-bold mb-1 px-1" style={{ color: groupStyle?.from ?? "#5B4FD4" }}>
                        {getSenderName(msg.senderId)}
                      </span>
                    )}

                    {msg.isDeleted ? (
                      <div className="px-4 py-2 rounded-2xl border border-dashed border-border bg-muted/50 text-muted-foreground text-sm italic">
                        This message was deleted
                      </div>
                    ) : (
                      <div className="relative group">
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed transition-all ${
                          isOwn
                            ? "bg-[#5B4FD4] text-white rounded-br-sm shadow-lg shadow-[#5B4FD4]/25"
                            : "bg-secondary text-foreground border border-border shadow-sm rounded-bl-sm"
                        }`}>
                          {msg.fileUrl && <MessageFile fileUrl={msg.fileUrl} fileName={msg.fileName} fileType={msg.fileType} isOwn={isOwn} />}
                          {msg.content && !msg.fileUrl && <span>{msg.content}</span>}
                          {msg.content && msg.fileUrl && msg.content !== "📷 Photo" && !msg.content.startsWith("📎") && (
                            <p className="mt-1 text-sm">{msg.content}</p>
                          )}

                          {isOwn && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -left-2 w-5 h-5 rounded-full hidden group-hover:flex items-center justify-center shadow-md p-0"
                              onClick={() => deleteMessage({ messageId: msg._id })}>
                              <Trash2 className="w-2.5 h-2.5" />
                            </Button>
                          )}
                        </div>

                        {/* Quick reactions */}
                        <div className={`absolute ${isOwn ? "right-0" : "left-0"} -top-10 hidden group-hover:flex bg-card border border-border rounded-full shadow-lg px-2 py-1.5 gap-1 z-20`}>
                          {QUICK_REACTIONS.map((emoji) => (
                            <button key={emoji}
                              onClick={() => toggleReaction({ messageId: msg._id, userId: currentUser._id, emoji })}
                              className="text-base hover:scale-125 transition-transform leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent">
                              {emoji}
                            </button>
                          ))}
                          <Separator orientation="vertical" className="h-5 self-center mx-0.5" />
                          <Button variant="ghost" size="icon"
                            className="w-7 h-7 rounded-full text-muted-foreground hover:text-foreground"
                            onClick={() => setReactionPickerMsgId(reactionPickerMsgId === msg._id ? null : msg._id)}>
                            <SmilePlus className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {reactionPickerMsgId === msg._id && (
                          <div ref={emojiPickerRef} className={`absolute ${isOwn ? "right-0" : "left-0"} bottom-12 z-30`}>
                            <EmojiPicker theme={emojiTheme} onEmojiClick={(d) => onReactionEmojiClick(d, msg._id)} height={350} width={300} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {Object.entries(msg.reactions.reduce((acc: Record<string, number>, r) => {
                          acc[r.emoji] = (acc[r.emoji] ?? 0) + 1; return acc;
                        }, {})).map(([emoji, count]) => {
                          const reacted = msg.reactions?.some((r) => r.emoji === emoji && r.userId === currentUser._id);
                          return (
                            <button key={emoji}
                              onClick={() => toggleReaction({ messageId: msg._id, userId: currentUser._id, emoji })}
                              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border font-semibold transition-all hover:scale-105 ${
                                reacted
                                  ? "bg-[#5B4FD4]/10 border-[#5B4FD4]/30 text-[#5B4FD4]"
                                  : "bg-secondary border-border text-muted-foreground hover:border-[#5B4FD4]/30"
                              }`}>
                              {emoji} {count}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <span className="text-[10px] text-muted-foreground mt-1 px-1 flex items-center gap-1">
                      {formatTime(msg._creationTime)}
                      {isOwn && <CheckCheck className="w-3 h-3 text-[#5B4FD4]/60" />}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {typingUsers && typingUsers.length > 0 && (
            <div className="flex items-end gap-2 mt-2">
              <Avatar className="w-7 h-7 flex-shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-[#5B4FD4] to-[#7C6FF5] text-white text-[10px] font-bold">
                  {isGroup ? (typingUsers[0] as { userName?: string }).userName?.[0]?.toUpperCase() ?? "?" : otherUser?.name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="bg-secondary border border-border shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground italic">
                {isGroup
                  ? `${(typingUsers[0] as { userName?: string }).userName ?? "Someone"} is typing...`
                  : `${otherUser?.name} is typing...`}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── NEW MESSAGES PILL ── */}
        {showNewMsg && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
            <Button onClick={scrollToBottom} size="sm"
              className="bg-[#5B4FD4] hover:bg-[#4a3fc7] text-white font-bold px-4 rounded-full shadow-xl shadow-[#5B4FD4]/30 gap-1.5">
              <ChevronDown className="w-3.5 h-3.5" />
              New messages
            </Button>
          </div>
        )}

        {/* ── ERROR BANNER (failed message retry) ── */}
        {(failedMessage !== null || failedFile !== null) && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-destructive/10 border-t border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive font-medium flex-1 min-w-0 truncate">
              {failedFile
                ? `Failed to send "${failedFile.name}"`
                : `Failed to send: "${failedMessage}"`}
            </p>
            <button
              onClick={handleRetry}
              disabled={isUploading}
              className="flex items-center gap-1.5 text-xs font-bold text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {isUploading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RotateCcw className="w-3 h-3" />}
              Retry
            </button>
            <button
              onClick={handleDismissError}
              className="text-destructive/60 hover:text-destructive transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── INPUT ── */}
        <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm flex items-center gap-2 relative">
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-16 left-4 z-30 shadow-2xl rounded-2xl overflow-hidden">
              <EmojiPicker theme={emojiTheme} onEmojiClick={onEmojiClick} height={400} width={320} />
            </div>
          )}

          {pendingFile && <FilePreview file={pendingFile} onRemove={() => setPendingFile(null)} />}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon"
                className={`w-9 h-9 rounded-xl flex-shrink-0 transition-all ${
                  showEmojiPicker ? "bg-[#5B4FD4]/10 text-[#5B4FD4]" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                onClick={() => { setShowEmojiPicker((p) => !p); setReactionPickerMsgId(null); }}>
                <span className="text-lg leading-none">😊</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Emoji</TooltipContent>
          </Tooltip>

          <FileUploadButton onFileSelect={handleFileSelect} disabled={isUploading} />

          <Input
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={isGroup ? `Message ${groupName}...` : `Message ${otherUser?.name}...`}
            className="flex-1 rounded-2xl bg-secondary border-border text-sm focus-visible:ring-[#5B4FD4]/20 focus-visible:border-[#5B4FD4] placeholder:text-muted-foreground h-10"
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleSend}
                disabled={(!input.trim() && !pendingFile) || isUploading}
                size="icon"
                className="w-10 h-10 rounded-xl bg-[#5B4FD4] hover:bg-[#4a3fc7] text-white shadow-md shadow-[#5B4FD4]/30 hover:scale-105 active:scale-95 transition-all flex-shrink-0 disabled:shadow-none">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send (Enter)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}