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
        !c.isGroup &&
        c.participants.includes(args.currentUserId) &&
        c.participants.includes(args.otherUserId) &&
        c.participants.length === 2
    );
    if (found) return found._id;
    return await ctx.db.insert("conversations", {
      participants: [args.currentUserId, args.otherUserId],
      lastMessage: undefined,
      lastMessageTime: undefined,
      isGroup: false,
    });
  },
});

export const createGroupConversation = mutation({
  args: {
    creatorId: v.id("users"),
    memberIds: v.array(v.id("users")),
    groupName: v.string(),
  },
  handler: async (ctx, args) => {
    const participants = [args.creatorId, ...args.memberIds];
    const convId = await ctx.db.insert("conversations", {
      participants,
      lastMessage: undefined,
      lastMessageTime: undefined,
      isGroup: true,
      groupName: args.groupName,
      groupCreatedBy: args.creatorId,
    });
    return convId;
  },
});

export const getUserConversations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("conversations").collect();
    const mine = all.filter((c) => c.participants.includes(args.userId));

    return await Promise.all(
      mine.map(async (conv) => {
        const unread = await ctx.db
          .query("unreadCounts")
          .withIndex("by_user_conversation", (q) =>
            q.eq("userId", args.userId).eq("conversationId", conv._id)
          )
          .first();

        if (conv.isGroup) {
          // For groups, fetch all member details
          const members = await Promise.all(
            conv.participants.map((id) => ctx.db.get(id))
          );
          return {
            ...conv,
            otherUser: null,
            members: members.filter(Boolean),
            unreadCount: unread?.count ?? 0,
          };
        } else {
          const otherId = conv.participants.find((p) => p !== args.userId)!;
          const otherUser = await ctx.db.get(otherId);
          return {
            ...conv,
            otherUser,
            members: null,
            unreadCount: unread?.count ?? 0,
          };
        }
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

    // Enrich with user names for group chats
    return await Promise.all(
      typing.map(async (t) => {
        const user = await ctx.db.get(t.userId);
        return { ...t, userName: user?.name ?? "Someone" };
      })
    );
  },
});