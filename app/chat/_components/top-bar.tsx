"use client";

import { ChevronDown, Mic, FileText, Film } from "lucide-react";
import BellIcon from "./icons/bell";
import ChatCircleIcon from "./icons/chat-circle";
import SearchIcon from "./icons/search";
import SettingsGearIcon from "./icons/settings-gear";
import CommandKIcon from "./icons/command-k";
import StarFourIcon from "./icons/star-four";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useNotificationChannel, type NotificationEvent } from "@/lib/use-apinator";

const avatarColors = [
  "from-emerald-400 to-teal-500",
  "from-blue-400 to-indigo-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-violet-400 to-purple-500",
  "from-cyan-400 to-sky-500",
];

function getInitials(name: string | undefined): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getColorIndex(name: string | undefined): number {
  if (!name) return 0;
  return name.charCodeAt(0) % avatarColors.length;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotificationMessage {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  conversationId: string;
  senderName: string | null;
  senderImage: string | null;
  senderId: string;
}

interface TopBarProps {
  userImage?: string;
  currentUserId?: string;
  onNotificationClick?: (conversationId: string) => void;
  onAIClick?: () => void;
}

export default function TopBar({ userImage, currentUserId, onNotificationClick, onAIClick }: TopBarProps) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  // Fetch initial notifications once on mount
  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (data.messages) setNotifications(data.messages);
        if (typeof data.totalUnread === "number") setTotalUnread(data.totalUnread);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time notifications via Apinator
  const onNewNotification = useCallback((data: NotificationEvent) => {
    setNotifications((prev) => [data, ...prev].slice(0, 20));
    setTotalUnread((prev) => prev + 1);
  }, []);

  const onNotificationsRead = useCallback((data: { conversationId: string }) => {
    // Remove notifications for this conversation + decrease count
    setNotifications((prev) => {
      const remaining = prev.filter((n) => n.conversationId !== data.conversationId);
      const removed = prev.length - remaining.length;
      setTotalUnread((t) => Math.max(0, t - removed));
      return remaining;
    });
  }, []);

  useNotificationChannel(currentUserId ?? null, {
    onNewNotification,
    onNotificationsRead,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function getMessagePreview(msg: NotificationMessage): string {
    switch (msg.type) {
      case "IMAGE": return "Sent a photo";
      case "VIDEO": return "Sent a video";
      case "AUDIO": return "Sent a voice message";
      case "FILE": return "Sent a file";
      default: return msg.content.length > 50 ? msg.content.slice(0, 50) + "..." : msg.content;
    }
  }

  function getMessageIcon(type: string) {
    switch (type) {
      case "IMAGE": return <Film className="w-3 h-3 text-text-placeholder" strokeWidth={1.8} />;
      case "VIDEO": return <Film className="w-3 h-3 text-text-placeholder" strokeWidth={1.8} />;
      case "AUDIO": return <Mic className="w-3 h-3 text-text-placeholder" strokeWidth={1.8} />;
      case "FILE": return <FileText className="w-3 h-3 text-text-placeholder" strokeWidth={1.8} />;
      default: return null;
    }
  }

  return (
    <div className="bg-bg-surface rounded-2xl px-3 md:px-6 py-3 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChatCircleIcon className="w-[20px] h-[20px] text-text-main" />
          <span className="text-sm font-medium text-text-main leading-5 tracking-[-0.084px]">
            Message
          </span>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex items-center gap-2 w-[375px] h-8 pl-2.5 pr-1 rounded-[10px] border border-stroke-soft">
            <SearchIcon className="w-[17.5px] h-[17.5px] text-text-soft opacity-50 shrink-0" />
            <span className="flex-1 text-xs text-text-soft leading-4">Search</span>
            <div className="flex items-center px-1.5 py-1 bg-bg-surface-weak rounded-md">
              <CommandKIcon />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile AI button */}
            <button
              onClick={onAIClick}
              className="flex md:hidden items-center justify-center w-8 h-8 rounded-lg border border-border-primary hover:bg-bg-surface-weak transition-colors"
            >
              <StarFourIcon className="w-4 h-4 text-text-sub" />
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => { setBellOpen(!bellOpen); setMenuOpen(false); }}
                className="relative flex items-center justify-center w-8 h-8 rounded-lg border border-border-primary hover:bg-bg-surface-weak transition-colors"
              >
                <BellIcon className="w-4 h-4 text-text-sub" />
                {totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </button>

              {bellOpen && (
                <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] md:w-[360px] max-w-[360px] bg-bg-surface rounded-2xl shadow-[0_1px_14px_1px_rgba(18,18,18,0.1)] z-50 animate-fade-in overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
                    <h3 className="text-sm font-semibold text-text-heading leading-5">
                      Notifications
                    </h3>
                    {totalUnread > 0 && (
                      <span className="text-[10px] font-medium text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full">
                        {totalUnread} unread
                      </span>
                    )}
                  </div>

                  <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <BellIcon className="w-8 h-8 text-text-soft" />
                        <p className="text-xs text-text-placeholder">No new notifications</p>
                      </div>
                    ) : (
                      notifications.map((msg) => (
                        <button
                          key={msg.id}
                          onClick={() => {
                            setBellOpen(false);
                            onNotificationClick?.(msg.conversationId);
                          }}
                          className="flex items-start gap-3 w-full px-4 py-3 hover:bg-bg-surface-weak transition-colors text-left border-b border-border-primary/50 last:border-b-0"
                        >
                          {msg.senderImage ? (
                            <img
                              src={msg.senderImage}
                              alt={msg.senderName ?? ""}
                              className="w-9 h-9 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-full bg-linear-to-br ${avatarColors[getColorIndex(msg.senderName ?? undefined)]} flex items-center justify-center text-white text-[10px] font-semibold shrink-0`}>
                              {getInitials(msg.senderName ?? undefined)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-text-heading leading-4">
                                {msg.senderName ?? "User"}
                              </span>
                              <span className="text-[10px] text-text-placeholder leading-3 shrink-0 ml-2">
                                {timeAgo(msg.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {getMessageIcon(msg.type)}
                              <span className="text-[11px] text-text-sub leading-4 truncate">
                                {getMessagePreview(msg)}
                              </span>
                            </div>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button className="flex items-center justify-center w-8 h-8 rounded-lg border border-border-primary hover:bg-bg-surface-weak transition-colors">
              <SettingsGearIcon className="w-4 h-4 text-text-sub" />
            </button>
          </div>

          <div className="w-px h-5 bg-stroke-soft" />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setMenuOpen(!menuOpen); setBellOpen(false); }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              {userImage ? (
                <img src={userImage} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className={`w-8 h-8 rounded-full bg-linear-to-br ${avatarColors[getColorIndex(session?.user?.name ?? undefined)]} flex items-center justify-center text-white text-xs font-semibold`}>
                  {getInitials(session?.user?.name ?? undefined)}
                </div>
              )}
              <ChevronDown
                className={`w-5 h-5 text-text-sub transition-transform duration-200 ${
                  menuOpen ? "rotate-180" : ""
                }`}
                strokeWidth={1.8}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-[280px] bg-bg-surface rounded-2xl shadow-[0_1px_14px_1px_rgba(18,18,18,0.1)] py-1 z-50 animate-fade-in">
                <div className="px-3 py-2">
                  <div className="p-2 rounded-lg">
                    <p className="text-sm font-semibold text-text-heading leading-5 tracking-[-0.14px]">
                      {session?.user?.name ?? "User"}
                    </p>
                    <p className="text-xs text-text-placeholder leading-normal tracking-[-0.12px]">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-border-primary mx-2" />

                <div className="px-3 py-1">
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center gap-2 w-full p-2 rounded-lg text-sm font-medium text-text-heading tracking-[-0.14px] hover:bg-bg-tertiary transition-colors"
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
