"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Apinator, type Channel } from "@apinator/client";

export interface PresenceMember {
  user_id: string;
  user_info: { name: string; email: string; image: string | null };
}

let clientInstance: InstanceType<typeof Apinator> | null = null;

function getClient() {
  if (!clientInstance) {
    console.log("[apinator] creating client, appKey:", process.env.NEXT_PUBLIC_APINATOR_KEY ? "SET" : "MISSING");
    clientInstance = new Apinator({
      appKey: process.env.NEXT_PUBLIC_APINATOR_KEY!,
      cluster: process.env.NEXT_PUBLIC_APINATOR_CLUSTER ?? "us",
      authEndpoint: "/api/realtime/auth",
    });
    clientInstance.connect();
  }
  return clientInstance;
}

// ─── Presence ────────────────────────────────────────────────

interface PresenceSnapshot {
  presence: {
    count: number;
    ids: string[];
    hash: Record<string, Record<string, unknown>>;
  };
}

export function usePresenceChannel(channelName: string) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceMember[]>([]);

  useEffect(() => {
    const client = getClient();
    let channel: Channel;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let cancelled = false;

    function subscribe() {
      // Unsubscribe any existing stale channel first
      if (client.channel(channelName)) {
        client.unsubscribe(channelName);
      }
      channel = client.subscribe(channelName);

      channel.bind("realtime:subscription_succeeded", (data: unknown) => {
        retryCount = 0;
        console.log("[presence] subscription_succeeded, raw data:", JSON.stringify(data));
        const snapshot = data as PresenceSnapshot;
        if (!snapshot?.presence?.ids) {
          console.warn("[presence] no presence.ids in data");
          return;
        }
        const users: PresenceMember[] = snapshot.presence.ids.map((id) => ({
          user_id: id,
          user_info: (snapshot.presence.hash[id] ?? {}) as PresenceMember["user_info"],
        }));
        console.log("[presence] online users:", users.map((u) => u.user_id));
        setOnlineUsers(users);
      });

      channel.bind("realtime:member_added", (data: unknown) => {
        console.log("[presence] member_added:", JSON.stringify(data));
        const member = data as PresenceMember;
        if (!member?.user_id) return;
        setOnlineUsers((prev) => {
          if (prev.find((u) => u.user_id === member.user_id)) return prev;
          return [...prev, member];
        });
      });

      channel.bind("realtime:member_removed", (data: unknown) => {
        console.log("[presence] member_removed:", JSON.stringify(data));
        const member = data as { user_id: string };
        if (!member?.user_id) return;
        setOnlineUsers((prev) =>
          prev.filter((u) => u.user_id !== member.user_id)
        );
      });

      channel.bind("realtime:subscription_error", (err: unknown) => {
        console.error("[presence] subscription_error:", err);
        if (cancelled) return;
        retryCount++;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 15000);
        retryTimer = setTimeout(() => {
          if (!cancelled) subscribe();
        }, delay);
      });
    }

    subscribe();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      client.unsubscribe(channelName);
    };
  }, [channelName]);

  return { onlineUsers };
}

// ─── Chat channel ────────────────────────────────────────────

export interface IncomingMessage {
  id: string;
  content: string;
  type?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  isEdited?: boolean;
  isDeleted?: boolean;
  isForwarded?: boolean;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
    senderName?: string | null;
  } | null;
  senderId: string;
  senderName: string;
  createdAt: string;
}

export interface ChatChannelHandlers {
  onNewMessage?: (msg: IncomingMessage) => void;
  onMessageEdited?: (data: { id: string; content: string; isEdited: boolean }) => void;
  onMessageDeleted?: (data: { id: string }) => void;
  onMessagesRead?: (data: { conversationId: string; readBy: string }) => void;
}

export function useChatChannel(
  conversationId: string | null,
  handlers?: ChatChannelHandlers
) {
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!conversationId) return;

    const client = getClient();
    const channelName = `private-chat-${conversationId}`;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let cancelled = false;

    function onMessage(data: unknown) {
      try {
        console.log("[chat] new-message event received:", typeof data, JSON.stringify(data).slice(0, 200));
        const msg: IncomingMessage =
          typeof data === "string"
            ? JSON.parse(data)
            : (data as IncomingMessage);
        handlersRef.current?.onNewMessage?.(msg);
      } catch (err) {
        console.error("[chat] onMessage error:", err);
      }
    }

    function onEdited(data: unknown) {
      try {
        console.log("[chat] message-edited event received:", JSON.stringify(data));
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        handlersRef.current?.onMessageEdited?.(parsed as { id: string; content: string; isEdited: boolean });
      } catch (err) {
        console.error("[chat] onEdited error:", err);
      }
    }

    function onDeleted(data: unknown) {
      try {
        console.log("[chat] message-deleted event received:", JSON.stringify(data));
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        handlersRef.current?.onMessageDeleted?.(parsed as { id: string });
      } catch (err) {
        console.error("[chat] onDeleted error:", err);
      }
    }

    function onRead(data: unknown) {
      try {
        console.log("[chat] messages-read event received:", JSON.stringify(data));
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        handlersRef.current?.onMessagesRead?.(parsed as { conversationId: string; readBy: string });
      } catch (err) {
        console.error("[chat] onRead error:", err);
      }
    }

    function onTyping(data: unknown) {
      console.log("[chat] client-typing event received:", JSON.stringify(data));
      const { user } = data as { user: string };
      setTypingUser(user);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2000);
    }

    function subscribe() {
      console.log("[chat] subscribing to", channelName);
      if (client.channel(channelName)) {
        client.unsubscribe(channelName);
      }
      const channel = client.subscribe(channelName);
      channelRef.current = channel;

      channel.bind("new-message", onMessage);
      channel.bind("message-edited", onEdited);
      channel.bind("message-deleted", onDeleted);
      channel.bind("messages-read", onRead);
      channel.bind("client-typing", onTyping);

      channel.bind("realtime:subscription_error", (err: unknown) => {
        console.error("[chat] subscription_error for", channelName, err);
        if (cancelled) return;
        retryCount++;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 15000);
        retryTimer = setTimeout(() => {
          if (!cancelled) subscribe();
        }, delay);
      });

      channel.bind("realtime:subscription_succeeded", () => {
        console.log("[chat] subscription_succeeded for", channelName);
        retryCount = 0;
      });
    }

    subscribe();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      client.unsubscribe(channelName);
      channelRef.current = null;
    };
  }, [conversationId]);

  const sendTyping = useCallback((userName: string) => {
    try {
      channelRef.current?.trigger("client-typing", { user: userName });
    } catch {
      // Channel not yet subscribed — silently skip
    }
  }, []);

  return { typingUser, sendTyping };
}

// ─── Notification channel (per-user) ─────────────────────────

export interface NotificationEvent {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  conversationId: string;
  senderId: string;
  senderName: string | null;
  senderImage: string | null;
}

export interface NotificationChannelHandlers {
  onNewNotification?: (data: NotificationEvent) => void;
  onNotificationsRead?: (data: { conversationId: string }) => void;
}

export function useNotificationChannel(
  userId: string | null,
  handlers?: NotificationChannelHandlers
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!userId) return;

    const client = getClient();
    const channelName = `private-user-${userId}`;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    let cancelled = false;

    function onNotification(data: unknown) {
      try {
        const parsed: NotificationEvent =
          typeof data === "string" ? JSON.parse(data) : (data as NotificationEvent);
        handlersRef.current?.onNewNotification?.(parsed);
      } catch (err) {
        console.error("[notification] onNotification error:", err);
      }
    }

    function onRead(data: unknown) {
      try {
        const parsed = typeof data === "string" ? JSON.parse(data) : data;
        handlersRef.current?.onNotificationsRead?.(parsed as { conversationId: string });
      } catch (err) {
        console.error("[notification] onRead error:", err);
      }
    }

    function subscribe() {
      if (client.channel(channelName)) {
        client.unsubscribe(channelName);
      }
      const channel = client.subscribe(channelName);

      channel.bind("new-notification", onNotification);
      channel.bind("notifications-read", onRead);

      channel.bind("realtime:subscription_error", (err: unknown) => {
        console.error("[notification] subscription_error:", err);
        if (cancelled) return;
        retryCount++;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 15000);
        retryTimer = setTimeout(() => {
          if (!cancelled) subscribe();
        }, delay);
      });

      channel.bind("realtime:subscription_succeeded", () => {
        retryCount = 0;
      });
    }

    subscribe();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      client.unsubscribe(channelName);
    };
  }, [userId]);
}
