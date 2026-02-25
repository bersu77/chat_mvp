"use client";

import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "./_components/sidebar";
import TopBar from "./_components/top-bar";
import ConversationList from "./_components/conversation-list";
import ChatArea from "./_components/chat-area";
import { usePresenceChannel, type PresenceMember } from "@/lib/use-apinator";

export interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface ConversationData {
  id: string;
  otherUser: UserInfo | null;
  lastMessage: {
    content: string;
    type: string;
    fileUrl?: string | null;
    fileName?: string | null;
    createdAt: string;
    senderId: string;
    isRead?: boolean;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeOtherUser, setActiveOtherUser] = useState<UserInfo | null>(null);
  const [currentUserImage, setCurrentUserImage] = useState<string | null>(null);

  const { onlineUsers } = usePresenceChannel("presence-global");

  // Fetch current user's profile (for avatar)
  const fetchMyProfile = useCallback(() => {
    if (!session) return;
    fetch("/api/users/me")
      .then((r) => { if (!r.ok) throw new Error(`Me API ${r.status}`); return r.json(); })
      .then((data) => { if (data?.image) setCurrentUserImage(data.image); })
      .catch(console.error);
  }, [session]);

  useEffect(() => { fetchMyProfile(); }, [fetchMyProfile]);

  // Fetch all users
  useEffect(() => {
    if (!session) return;
    fetch("/api/users")
      .then((r) => {
        if (!r.ok) throw new Error(`Users API ${r.status}`);
        return r.json();
      })
      .then((data) => { if (Array.isArray(data)) setAllUsers(data); })
      .catch(console.error);
  }, [session]);

  // Fetch conversations
  const fetchConversations = useCallback(() => {
    if (!session) return;
    fetch("/api/conversations")
      .then((r) => {
        if (!r.ok) throw new Error(`Conversations API ${r.status}`);
        return r.json();
      })
      .then((data) => { if (Array.isArray(data)) setConversations(data); setConversationsLoaded(true); })
      .catch((e) => { console.error(e); setConversationsLoaded(true); });
  }, [session]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Build the online user IDs set from WebSocket presence channel
  const onlineUserIds = new Set(
    onlineUsers.map((u: PresenceMember) => u.user_id)
  );

  // Start a chat with a user (create or open existing conversation)
  const startChat = useCallback(
    async (otherUserId: string) => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId }),
      });
      const data = await res.json();
      setActiveConversationId(data.id);

      const currentUserId = (session?.user as { id: string })?.id;
      const other = data.participants?.find(
        (p: UserInfo) => p.id !== currentUserId
      );
      if (other) setActiveOtherUser(other);

      fetchConversations();
    },
    [session, fetchConversations]
  );

  // Select an existing conversation
  const selectConversation = useCallback(
    (convId: string) => {
      setActiveConversationId(convId);
      const conv = conversations.find((c) => c.id === convId);
      if (conv?.otherUser) setActiveOtherUser(conv.otherUser);
    },
    [conversations]
  );

  if (status === "loading") {
    return (
      <div className="h-full w-full bg-bg-page flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  const currentUserId = (session.user as { id: string }).id;

  const handleBack = useCallback(() => {
    setActiveConversationId(null);
    setActiveOtherUser(null);
  }, []);

  return (
    <div className="h-full w-full bg-bg-page flex overflow-hidden">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar
          userAvatar={currentUserImage ?? undefined}
          userName={session.user?.name ?? undefined}
          userEmail={session.user?.email ?? undefined}
          onAvatarUpdated={fetchMyProfile}
        />
      </div>

      <div className="flex-1 flex flex-col gap-2 md:gap-3 min-w-0 p-2 md:p-3 md:pl-0">
        {/* TopBar — hidden on mobile when viewing a chat */}
        <div className={`${activeConversationId ? "hidden md:block" : ""}`}>
          <TopBar userImage={currentUserImage ?? undefined} currentUserId={currentUserId} onNotificationClick={selectConversation} />
        </div>

        <div className="flex-1 flex gap-2 md:gap-3 min-h-0 overflow-hidden">
          {/* Conversation list — full width on mobile, hidden when chat is active */}
          <div className={`${activeConversationId ? "hidden md:flex" : "flex"} w-full md:w-[400px] md:shrink-0 min-h-0`}>
            <ConversationList
              conversations={conversations}
              loading={!conversationsLoaded}
              allUsers={allUsers}
              onlineUserIds={onlineUserIds}
              activeId={activeConversationId}
              currentUserId={currentUserId}
              onSelect={selectConversation}
              onStartChat={startChat}
            />
          </div>

          {/* Chat area — full width on mobile, hidden when no chat is active on mobile */}
          <div className={`${activeConversationId ? "flex" : "hidden md:flex"} flex-1 min-w-0 min-h-0`}>
            <ChatArea
              conversationId={activeConversationId}
              otherUser={activeOtherUser}
              currentUserId={currentUserId}
              currentUserName={session.user?.name ?? "Me"}
              isOtherUserOnline={
                activeOtherUser ? onlineUserIds.has(activeOtherUser.id) : false
              }
              onMessageSent={fetchConversations}
              onBack={handleBack}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
