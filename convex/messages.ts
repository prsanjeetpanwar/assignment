import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    fileId:   v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    fileType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Resolve the storage URL server-side (the correct Convex way)
    let fileUrl: string | undefined = undefined;
    if (args.fileId) {
      fileUrl = (await ctx.storage.getUrl(args.fileId)) ?? undefined;
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      content: args.content,
      isDeleted: false,
      fileId:   args.fileId,
      fileUrl,
      fileName: args.fileName,
      fileType: args.fileType,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessage: args.content,
      lastMessageTime: Date.now(),
    });

    const conv = await ctx.db.get(args.conversationId);
    if (conv) {
      const others = conv.participants.filter((p) => p !== args.senderId);
      for (const userId of others) {
        const existing = await ctx.db
          .query("unreadCounts")
          .withIndex("by_user_conversation", (q) =>
            q.eq("userId", userId).eq("conversationId", args.conversationId)
          )
          .first();
        if (existing) {
          await ctx.db.patch(existing._id, { count: existing.count + 1 });
        } else {
          await ctx.db.insert("unreadCounts", {
            userId,
            conversationId: args.conversationId,
            count: 1,
          });
        }
      }
    }

    return messageId;
  },
});

export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    return await Promise.all(
      messages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        // Always re-resolve from storage so URLs are fresh and correct
        let fileUrl = msg.fileUrl;
        if (msg.fileId) {
          fileUrl = (await ctx.storage.getUrl(msg.fileId)) ?? undefined;
        }
        return { ...msg, fileUrl, sender };
      })
    );
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { isDeleted: true });
  },
});

export const clearUnread = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("unreadCounts")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", args.userId).eq("conversationId", args.conversationId)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { count: 0 });
    }
  },
});

export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;

    const reactions = message.reactions ?? [];
    const existing = reactions.find(
      (r) => r.emoji === args.emoji && r.userId === args.userId
    );

    if (existing) {
      await ctx.db.patch(args.messageId, {
        reactions: reactions.filter(
          (r) => !(r.emoji === args.emoji && r.userId === args.userId)
        ),
      });
    } else {
      await ctx.db.patch(args.messageId, {
        reactions: [...reactions, { emoji: args.emoji, userId: args.userId }],
      });
    }
  },
});