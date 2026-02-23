"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import Sidebar from "@/app/components/Sidebar";
import ChatArea from "@/app/components/chatArea";
import { Skeleton } from "@/components/ui/skeleton";

type ConvexUser = {
  _id: Id<"users">;
  name: string;
  email: string;
  imageUrl?: string;
  isOnline: boolean;
  clerkId: string;
};

export default function Home() {
  const { user, isLoaded } = useUser();
  const syncUser = useMutation(api.users.syncUser);
  const updatePresence = useMutation(api.users.updatePresence);

  const [selectedConvId, setSelectedConvId] =
    useState<Id<"conversations"> | null>(null);
  const [selectedUser, setSelectedUser] =
    useState<ConvexUser | null>(null);

  const currentUser = useQuery(api.users.getUserByClerkId, {
    clerkId: user?.id ?? "",
  });

  const getOrCreate = useMutation(
    api.conversations.getOrCreateConversation
  );

  /* -------------------- Sync User -------------------- */
  useEffect(() => {
    if (isLoaded && user) {
      syncUser({
        clerkId: user.id,
        name: user.fullName ?? user.username ?? "Anonymous",
        email: user.emailAddresses[0]?.emailAddress ?? "",
        imageUrl: user.imageUrl,
      });
    }
  }, [isLoaded, user, syncUser]);

  /* -------------------- Presence -------------------- */
  useEffect(() => {
    if (!user) return;

    updatePresence({ clerkId: user.id, isOnline: true });

    const handleUnload = () => {
      updatePresence({ clerkId: user.id, isOnline: false });
    };

    const handleVisibility = () => {
      updatePresence({
        clerkId: user.id,
        isOnline: !document.hidden,
      });
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user, updatePresence]);

  /* -------------------- Select Conversation -------------------- */
  const handleSelectConversation = async (
    convId: Id<"conversations"> | null,
    otherUser: ConvexUser
  ) => {
    setSelectedUser(otherUser);

    if (convId) {
      setSelectedConvId(convId);
    } else if (currentUser) {
      const id = await getOrCreate({
        currentUserId: currentUser._id,
        otherUserId: otherUser._id,
      });
      setSelectedConvId(id);
    }
  };

  /* -------------------- Skeleton Loading State -------------------- */
  if (!isLoaded || currentUser === undefined) {
    return (
      <main className="h-screen flex bg-[#F5F4F0] overflow-hidden">
        {/* Sidebar Skeleton */}
        <div className="w-full md:w-[300px] md:min-w-[300px] h-full border-r bg-white p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-full rounded-xl" />

          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>

        {/* Chat Area Skeleton */}
        <div className="hidden md:flex flex-1 h-full bg-white p-6 flex-col">
          <Skeleton className="h-8 w-40 mb-6" />
          <div className="flex-1 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-60 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-12 w-full rounded-xl mt-4" />
        </div>
      </main>
    );
  }

  /* -------------------- Main App -------------------- */
  return (
    <main className="h-screen flex bg-[#F5F4F0] overflow-hidden">

      {/* Sidebar */}
      <div
        className={`
          ${selectedConvId ? "hidden md:flex" : "flex"}
          w-full md:w-[300px] md:min-w-[300px]
          h-full flex-col
        `}
      >
        <Sidebar
          onSelectConversation={handleSelectConversation}
          selectedConversationId={selectedConvId}
        />
      </div>

      {/* Chat Area */}
      <div
        className={`
          ${selectedConvId ? "flex" : "hidden md:flex"}
          flex-1 w-full h-full overflow-hidden
        `}
      >
        {selectedConvId && selectedUser ? (
          <ChatArea
            conversationId={selectedConvId}
            otherUser={selectedUser}
            currentUser={currentUser as ConvexUser}
            onBack={() => {
              setSelectedConvId(null);
              setSelectedUser(null);
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-white">
            <div className="text-5xl mb-3">💬</div>
            <p className="text-[#6B6B85] font-semibold">
              Select a conversation
            </p>
            <p className="text-[#ABABC0] text-sm mt-1">
              Choose from your conversations on the left
            </p>
          </div>
        )}
      </div>

    </main>
  );
}