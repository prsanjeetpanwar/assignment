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
  otherUser: ConvexUser;
  currentUser: ConvexUser;
  onBack: () => void;
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isToday)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

export default function ChatArea({
  conversationId,
  otherUser,
  currentUser,
  onBack,
}: ChatAreaProps) {
  const { resolvedTheme } = useTheme();

  const [input, setInput] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<Id<"messages"> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

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

  // Clear unread when conversation opens
  useEffect(() => {
    clearUnread({ conversationId, userId: currentUser._id });
  }, [conversationId]);

  // Auto scroll on new messages
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

  // Close pickers on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
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
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Max size is 10MB.");
      return;
    }
    setPendingFile(file);
  };

  const handleSend = async () => {
    if (!input.trim() && !pendingFile) return;
    setIsUploading(true);

    try {
      let fileId: string | undefined = undefined;
      let fileName: string | undefined = undefined;
      let fileType: string | undefined = undefined;

      if (pendingFile) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": pendingFile.type },
          body: pendingFile,
        });
        const { storageId } = await result.json();
        fileId = storageId;
        // ✅ No manual fileUrl construction — server resolves it via ctx.storage.getUrl()
        fileName = pendingFile.name;
        fileType = pendingFile.type.startsWith("image/") ? "image" : "file";
        setPendingFile(null);
      }

      const content =
        input.trim() ||
        (fileType === "image" ? "📷 Photo" : `📎 ${fileName}`);

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
        // ✅ fileUrl intentionally omitted — server generates it
      });

      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      console.error("Send failed:", err);
      alert("Failed to send. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) handleSend();
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInput((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const onReactionEmojiClick = (
    emojiData: EmojiClickData,
    msgId: Id<"messages">
  ) => {
    toggleReaction({
      messageId: msgId,
      userId: currentUser._id,
      emoji: emojiData.emoji,
    });
    setReactionPickerMsgId(null);
  };

  const emojiTheme = resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT;

  // Loading state
  if (messages === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-2.5 h-2.5 bg-[#5B4FD4] rounded-full animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-card relative">

      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-card shadow-sm z-10">
        {/* Back (mobile) */}
        <button
          onClick={onBack}
          title="Back"
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth="2"
            className="text-muted-foreground">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5B4FD4] to-[#7C6FF5] flex items-center justify-center text-white font-bold text-sm overflow-hidden">
            {otherUser.imageUrl ? (
              <img src={otherUser.imageUrl} alt={otherUser.name} className="w-full h-full object-cover" />
            ) : (
              otherUser.name[0].toUpperCase()
            )}
          </div>
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${
            otherUser.isOnline ? "bg-green-500" : "bg-muted-foreground/30"
          }`} />
        </div>

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm leading-tight">{otherUser.name}</p>
          <p className={`text-xs font-medium ${otherUser.isOnline ? "text-green-500" : "text-muted-foreground"}`}>
            {otherUser.isOnline ? "● Active now" : "● Offline"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button title="Call"
            className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:bg-[#5B4FD4]/10 hover:text-[#5B4FD4] hover:border-[#5B4FD4]/20 transition-colors">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.2A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.59a16 16 0 0 0 6 6l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.7 16z" />
            </svg>
          </button>
          <button title="More options"
            className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:bg-[#5B4FD4]/10 hover:text-[#5B4FD4] hover:border-[#5B4FD4]/20 transition-colors">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── MESSAGES ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-5 bg-background flex flex-col gap-2"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <div className="text-5xl">👋</div>
            <p className="text-foreground font-semibold">No messages yet</p>
            <p className="text-muted-foreground text-sm">Say hi to {otherUser.name}!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.senderId === currentUser._id;
          const prev = messages[i - 1];
          const showDay = !prev || isNewDay(msg._creationTime, prev._creationTime);

          return (
            <div key={msg._id}>
              {/* Day divider */}
              {showDay && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest whitespace-nowrap">
                    {new Date(msg._creationTime).toDateString() === new Date().toDateString()
                      ? "Today"
                      : new Date(msg._creationTime).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              {/* Message row */}
              <div className={`flex items-end gap-2 mb-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                {!isOwn && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#5B4FD4] to-[#7C6FF5] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 overflow-hidden">
                    {otherUser.imageUrl
                      ? <img src={otherUser.imageUrl} alt={otherUser.name} className="w-full h-full object-cover" />
                      : otherUser.name[0].toUpperCase()}
                  </div>
                )}

                <div className={`max-w-[65%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                  {msg.isDeleted ? (
                    <div className="px-4 py-2 rounded-2xl border border-dashed border-border bg-muted text-muted-foreground text-sm italic">
                      This message was deleted
                    </div>
                  ) : (
                    <div className="relative group">
                      {/* Bubble */}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isOwn
                          ? "bg-[#5B4FD4] text-white rounded-br-sm shadow-md"
                          : "bg-secondary text-foreground border border-border shadow-sm rounded-bl-sm"
                      }`}>
                        {/* File or image */}
                        {msg.fileUrl && (
                          <MessageFile
                            fileUrl={msg.fileUrl}
                            fileName={msg.fileName}
                            fileType={msg.fileType}
                            isOwn={isOwn}
                          />
                        )}
                        {/* Plain text */}
                        {msg.content && !msg.fileUrl && (
                          <span>{msg.content}</span>
                        )}
                        {/* Caption alongside file */}
                        {msg.content && msg.fileUrl &&
                          msg.content !== "📷 Photo" &&
                          !msg.content.startsWith("📎") && (
                            <p className="mt-1 text-sm">{msg.content}</p>
                          )}

                        {/* Delete button */}
                        {isOwn && (
                          <button
                            onClick={() => deleteMessage({ messageId: msg._id })}
                            title="Delete"
                            className="absolute -top-2 -left-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-[10px] hidden group-hover:flex items-center justify-center shadow-md"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Quick reactions */}
                      <div className={`
                        absolute ${isOwn ? "right-0" : "left-0"} -top-10
                        hidden group-hover:flex
                        bg-card border border-border
                        rounded-full shadow-lg px-2 py-1.5 gap-1 z-20
                      `}>
                        {QUICK_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction({ messageId: msg._id, userId: currentUser._id, emoji })}
                            className="text-base hover:scale-125 transition-transform leading-none"
                          >
                            {emoji}
                          </button>
                        ))}
                        <button
                          onClick={() => setReactionPickerMsgId(
                            reactionPickerMsgId === msg._id ? null : msg._id
                          )}
                          className="text-[11px] text-muted-foreground hover:text-foreground px-1 font-bold border-l border-border ml-1 pl-2"
                        >
                          ＋
                        </button>
                      </div>

                      {/* Full emoji picker */}
                      {reactionPickerMsgId === msg._id && (
                        <div
                          ref={emojiPickerRef}
                          className={`absolute ${isOwn ? "right-0" : "left-0"} bottom-12 z-30`}
                        >
                          <EmojiPicker
                            theme={emojiTheme}
                            onEmojiClick={(d) => onReactionEmojiClick(d, msg._id)}
                            height={350}
                            width={300}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reaction counts */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {Object.entries(
                        msg.reactions.reduce((acc: Record<string, number>, r) => {
                          acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                          return acc;
                        }, {})
                      ).map(([emoji, count]) => {
                        const reacted = msg.reactions?.some(
                          (r) => r.emoji === emoji && r.userId === currentUser._id
                        );
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction({ messageId: msg._id, userId: currentUser._id, emoji })}
                            className={`
                              flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all
                              ${reacted
                                ? "bg-[#5B4FD4]/10 border-[#5B4FD4]/30 text-[#5B4FD4]"
                                : "bg-secondary border-border text-muted-foreground hover:border-[#5B4FD4]/30"
                              }
                            `}
                          >
                            {emoji} {count}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Timestamp */}
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {formatTime(msg._creationTime)}
                    {isOwn && " · ✓✓"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers && typingUsers.length > 0 && (
          <div className="flex items-end gap-2 mt-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#5B4FD4] to-[#7C6FF5] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {otherUser.name[0].toUpperCase()}
            </div>
            <div className="bg-secondary border border-border shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
              {[0, 150, 300].map((d) => (
                <span
                  key={d}
                  className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground italic">
              {otherUser.name} is typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── NEW MESSAGES BUTTON ── */}
      {showNewMsg && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={scrollToBottom}
            className="bg-[#5B4FD4] text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg hover:bg-[#4a3fc7] transition-colors"
          >
            ↓ New messages
          </button>
        </div>
      )}

      {/* ── INPUT AREA ── */}
      <div className="px-4 py-3 border-t border-border bg-card flex items-center gap-3 relative">

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-16 left-4 z-30">
            <EmojiPicker
              theme={emojiTheme}
              onEmojiClick={onEmojiClick}
              height={400}
              width={320}
            />
          </div>
        )}

        {/* File preview */}
        {pendingFile && (
          <FilePreview file={pendingFile} onRemove={() => setPendingFile(null)} />
        )}

        {/* Emoji button */}
        <button
          onClick={() => { setShowEmojiPicker((p) => !p); setReactionPickerMsgId(null); }}
          className={`text-xl flex-shrink-0 transition-colors ${
            showEmojiPicker ? "text-[#5B4FD4]" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          😊
        </button>

        {/* File upload */}
        <FileUploadButton onFileSelect={handleFileSelect} disabled={isUploading} />

        {/* Text input */}
        <input
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${otherUser.name}...`}
          className="
            flex-1 bg-secondary border border-border rounded-2xl
            px-4 py-2.5 text-sm text-foreground
            outline-none
            focus:border-[#5B4FD4] focus:ring-2 focus:ring-[#5B4FD4]/10
            placeholder:text-muted-foreground
            transition-all
          "
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={(!input.trim() && !pendingFile) || isUploading}
          className="
            w-10 h-10 bg-[#5B4FD4] rounded-xl
            flex items-center justify-center text-white
            shadow-md hover:bg-[#4a3fc7] hover:scale-105 active:scale-95
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all flex-shrink-0
          "
        >
          {isUploading ? (
            <svg className="animate-spin" width="16" height="16"
              viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="16" height="16" fill="none"
              stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path d="m22 2-11 11M22 2 15 22l-4-9-9-4 20-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}