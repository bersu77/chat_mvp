"use client";

import { X, Film, FileText, Mic } from "lucide-react";
import SearchIcon from "./icons/search";
import CheckReadIcon from "./icons/check-read";
import SingleCheckIcon from "./icons/single-check";
import PencilPlusIcon from "./icons/pencil-plus";
import FilterIcon from "./icons/filter";
import CommandKIcon from "./icons/command-k";
import ChatBubbleIcon from "./icons/chat-bubble";
import ArchiveIcon from "./icons/archive";
import MuteIcon from "./icons/mute";
import UserCircleIcon from "./icons/user-circle";
import ExportChatIcon from "./icons/export-chat";
import CloseXIcon from "./icons/close-x";
import TrashIcon from "./icons/trash";
import { useState, useRef, useEffect, useCallback } from "react";
import type { ConversationData, UserInfo } from "../page";

const contextMenuItems = [
  { icon: ChatBubbleIcon, label: "Mark as unread", color: "text-text-main" },
  { icon: ArchiveIcon, label: "Archive", color: "text-text-main" },
  { icon: MuteIcon, label: "Mute", color: "text-text-main" },
  { icon: UserCircleIcon, label: "Contact info", color: "text-text-main" },
  { icon: ExportChatIcon, label: "Export chat", color: "text-text-main" },
  { icon: CloseXIcon, label: "Clear chat", color: "text-text-main" },
  { icon: TrashIcon, label: "Delete chat", color: "text-[#DF1C41]" },
];

const avatarColors = [
  "from-emerald-400 to-teal-500",
  "from-blue-400 to-indigo-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-violet-400 to-purple-500",
  "from-cyan-400 to-sky-500",
];

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl w-full animate-pulse">
      <div className="w-10 h-10 rounded-full bg-bg-surface-weak shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-24 bg-bg-surface-weak rounded" />
          <div className="h-3 w-12 bg-bg-surface-weak rounded" />
        </div>
        <div className="h-3 w-40 bg-bg-surface-weak rounded" />
      </div>
    </div>
  );
}

interface ConversationListProps {
  conversations: ConversationData[];
  loading: boolean;
  allUsers: UserInfo[];
  onlineUserIds: Set<string>;
  activeId: string | null;
  currentUserId: string;
  onSelect: (id: string) => void;
  onStartChat: (userId: string) => void;
}

export default function ConversationList({
  conversations,
  loading,
  allUsers,
  onlineUserIds,
  activeId,
  currentUserId,
  onSelect,
  onStartChat,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    convId: string;
  } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, convId: string) => {
      e.preventDefault();
      const listRect = listRef.current
        ?.closest(".relative")
        ?.getBoundingClientRect();
      if (!listRect) return;
      const x = e.clientX - listRect.left;
      const y = e.clientY - listRect.top;
      setContextMenu({ x, y, convId });
    },
    []
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        setShowNewMessage(false);
      }
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = conversations.filter((c) => {
    const name = c.otherUser?.name ?? c.otherUser?.email ?? "";
    const msg = c.lastMessage?.content ?? "";
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || msg.toLowerCase().includes(q);
  });

  const filteredContacts = allUsers.filter((u) =>
    (u.name ?? u.email).toLowerCase().includes(contactSearch.toLowerCase())
  );

  // Sort users: online first, then alphabetically
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    const aOnline = onlineUserIds.has(a.id) ? 0 : 1;
    const bOnline = onlineUserIds.has(b.id) ? 0 : 1;
    if (aOnline !== bOnline) return aOnline - bOnline;
    return (a.name ?? a.email).localeCompare(b.name ?? b.email);
  });

  return (
    <div className="relative flex flex-col gap-6 h-full w-full shrink-0 bg-bg-surface rounded-3xl p-4 md:p-6 animate-slide-in-left">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-main leading-[30px]">
          All Message
        </h2>
        <button
          onClick={() => {
            setShowNewMessage(!showNewMessage);
            setContactSearch("");
          }}
          className="flex items-center gap-1.5 h-8 p-2 rounded-lg text-white text-sm font-medium border border-brand-500 bg-brand-500 from-white/12 to-transparent shadow-[inset_0px_1px_0px_1px_rgba(255,255,255,0.12)] hover:brightness-110 transition-all duration-200 active:scale-[0.5]"
        >
          <PencilPlusIcon />
          <span>New Message</span>
        </button>
      </div>

      {showNewMessage && (
        <div
          ref={popupRef}
          className="absolute top-[72px] right-6 z-20 flex flex-col w-[273px] h-[440px] p-3 bg-white border border-border-primary rounded-2xl shadow-[0px_0px_24px_rgba(0,0,0,0.06)] animate-fade-in"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-heading leading-5">
              New Message
            </h3>
            <button
              onClick={() => setShowNewMessage(false)}
              className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-bg-surface-weak transition-colors"
            >
              <X className="w-4 h-4 text-text-soft" strokeWidth={2} />
            </button>
          </div>
          <div className="flex items-center gap-2 h-9 px-2.5 rounded-lg border border-stroke-soft focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/20 transition-all duration-200 mb-3">
            <SearchIcon className="w-4 h-4 text-text-soft shrink-0" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              autoFocus
              className="flex-1 text-xs text-text-main placeholder:text-text-soft bg-transparent outline-none leading-4"
            />
          </div>

          <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
            {sortedContacts.map((user, index) => {
              const isOnline = onlineUserIds.has(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => {
                    setShowNewMessage(false);
                    onStartChat(user.id);
                  }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-surface-weak transition-colors duration-150 text-left animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="relative">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name ?? ""}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-8 h-8 rounded-full shrink-0 bg-linear-to-br ${
                          avatarColors[index % avatarColors.length]
                        } flex items-center justify-center text-white text-[10px] font-semibold`}
                      >
                        {getInitials(user.name ?? user.email)}
                      </div>
                    )}
                    {/* Online/offline indicator */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        isOnline ? "bg-emerald-400" : "bg-gray-300"
                      }`}
                    />
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="text-sm font-medium text-text-heading leading-5 tracking-[-0.084px] truncate">
                      {user.name ?? user.email}
                    </span>
                    <span
                      className={`text-[10px] leading-3 font-medium ${
                        isOnline ? "text-text-success" : "text-text-placeholder"
                      }`}
                    >
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </button>
              );
            })}
            {sortedContacts.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-text-placeholder">
                  No contacts found
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex-1 flex items-center gap-2 h-10 px-2.5 rounded-[10px] border border-stroke-soft focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/20 transition-all duration-200">
          <SearchIcon className="w-5 h-5 text-text-soft shrink-0" />
          <input
            type="text"
            placeholder="Search in message"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm text-text-main placeholder:text-text-soft bg-transparent outline-none leading-5 tracking-[-0.084px]"
          />
          <div className="hidden sm:flex items-center px-2 py-1 bg-bg-surface-weak rounded-md">
            <CommandKIcon />
          </div>
        </div>
        <button className="flex items-center justify-center w-10 h-10 rounded-[10px] border border-stroke-soft bg-bg-surface hover:bg-bg-surface-weak transition-colors duration-200">
          <FilterIcon />
        </button>
      </div>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="absolute z-30 flex flex-col justify-center items-center p-2 w-[200px] bg-white border border-border-primary rounded-2xl shadow-[0px_0px_24px_rgba(0,0,0,0.06)] animate-fade-in"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenuItems.map(({ icon: Icon, label, color }) => (
            <button
              key={label}
              onClick={() => setContextMenu(null)}
              className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg hover:bg-bg-page transition-colors text-left"
            >
              <Icon className={`w-4 h-4 ${color}`} />
              <span
                className={`text-sm font-medium ${color} leading-5 tracking-[-0.084px]`}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      )}

      <div
        ref={listRef}
        className="flex flex-col gap-2 overflow-y-auto flex-1 -mx-2"
      >
        {loading && conversations.length === 0 && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <ConversationSkeleton key={i} />
            ))}
          </>
        )}

        {!loading && filtered.length === 0 && conversations.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-bg-surface-weak flex items-center justify-center">
              <PencilPlusIcon className="w-7 h-7 text-text-soft" />
            </div>
            <p className="text-sm text-text-sub font-medium">No conversations yet</p>
            <p className="text-xs text-text-placeholder">
              Click &quot;New Message&quot; to start chatting
            </p>
          </div>
        )}

        {filtered.map((conv, index) => {
          const user = conv.otherUser;
          const isOnline = user ? onlineUserIds.has(user.id) : false;
          const isSentByMe = conv.lastMessage?.senderId === currentUserId;
          const hasUnread = conv.unreadCount > 0;

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              onContextMenu={(e) => handleContextMenu(e, conv.id)}
              className={`flex items-center gap-3 p-3 rounded-xl w-full text-left transition-all duration-200 animate-fade-in ${
                activeId === conv.id
                  ? "bg-bg-page"
                  : "hover:bg-bg-surface-weak"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="relative shrink-0">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? ""}
                    className="w-10 h-10 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-full bg-linear-to-br ${
                      avatarColors[index % avatarColors.length]
                    } flex items-center justify-center text-white text-xs font-semibold shadow-sm`}
                  >
                    {getInitials(user?.name ?? user?.email)}
                  </div>
                )}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    isOnline ? "bg-emerald-400" : "bg-gray-300"
                  }`}
                />
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium leading-5 tracking-[-0.084px] ${hasUnread ? "text-text-heading" : "text-text-heading"}`}>
                    {user?.name ?? user?.email ?? "Unknown"}
                  </span>
                  <span className={`text-xs leading-4 shrink-0 ml-2 ${hasUnread ? "text-brand-500 font-medium" : "text-text-placeholder"}`}>
                    {conv.lastMessage
                      ? timeAgo(conv.lastMessage.createdAt)
                      : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Check mark for sent messages */}
                  {conv.lastMessage && isSentByMe && (
                    conv.lastMessage.isRead
                      ? <CheckReadIcon className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      : <SingleCheckIcon className="w-3.5 h-3.5 text-text-sub/60 shrink-0" />
                  )}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {conv.lastMessage ? (
                      conv.lastMessage.type === "IMAGE" ? (
                        <>
                          {conv.lastMessage.fileUrl && (
                            <img
                              src={conv.lastMessage.fileUrl}
                              alt=""
                              className="w-4 h-4 rounded-[3px] object-cover shrink-0"
                            />
                          )}
                          <span className={`text-xs leading-4 truncate ${hasUnread ? "text-text-main font-medium" : "text-text-placeholder"}`}>Photo</span>
                        </>
                      ) : conv.lastMessage.type === "VIDEO" ? (
                        <>
                          <Film className="w-3.5 h-3.5 text-text-placeholder shrink-0" strokeWidth={1.8} />
                          <span className={`text-xs leading-4 truncate ${hasUnread ? "text-text-main font-medium" : "text-text-placeholder"}`}>Video</span>
                        </>
                      ) : conv.lastMessage.type === "AUDIO" ? (
                        <>
                          <Mic className="w-3.5 h-3.5 text-text-placeholder shrink-0" strokeWidth={1.8} />
                          <span className={`text-xs leading-4 truncate ${hasUnread ? "text-text-main font-medium" : "text-text-placeholder"}`}>Voice message</span>
                        </>
                      ) : conv.lastMessage.type === "FILE" ? (
                        <>
                          <FileText className="w-3.5 h-3.5 text-text-placeholder shrink-0" strokeWidth={1.8} />
                          <span className={`text-xs leading-4 truncate ${hasUnread ? "text-text-main font-medium" : "text-text-placeholder"}`}>
                            {conv.lastMessage.fileName ?? "Document"}
                          </span>
                        </>
                      ) : (
                        <p className={`text-xs leading-4 truncate ${hasUnread ? "text-text-main font-medium" : "text-text-placeholder"}`}>
                          {conv.lastMessage.content}
                        </p>
                      )
                    ) : (
                      <p className="text-xs text-text-placeholder leading-4 truncate">No messages yet</p>
                    )}
                  </div>
                  {/* Unread count badge */}
                  {hasUnread && (
                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-white text-[10px] font-semibold leading-none shrink-0">
                      {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
