import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getOrCreateConversation = mutation({
  args: {
    currentUserId: v.id("users"),
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("conversations").collect();
    const found = existing.find(
      (c) =>
        c.participants.includes(args.currentUserId) &&
        c.participants.includes(args.otherUserId)
    );
    if (found) return found._id;
    return await ctx.db.insert("conversations", {
      participants: [args.currentUserId, args.otherUserId],
      lastMessage: undefined,
      lastMessageTime: undefined,
    });
  },
});

export const getUserConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("conversations").collect();
    const mine = all.filter((c) => c.participants.includes(args.userId));

    return await Promise.all(
      mine.map(async (conv) => {
        const otherId = conv.participants.find((p) => p !== args.userId)!;
        const otherUser = await ctx.db.get(otherId);
        const unread = await ctx.db
          .query("unreadCounts")
          .withIndex("by_user_conversation", (q) =>
            q.eq("userId", args.userId).eq("conversationId", conv._id)
          )
          .first();
        return {
          ...conv,
          otherUser,
          unreadCount: unread?.count ?? 0,
        };
      })
    );
  },
});

export const getTypingUsers = query({
  args: {
    conversationId: v.id("conversations"),
    currentUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const twoSecondsAgo = Date.now() - 2000;
    const typing = await ctx.db
      .query("typing")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("userId"), args.currentUserId),
          q.gt(q.field("updatedAt"), twoSecondsAgo)
        )
      )
      .collect();
    return typing;
  },
});