"use client";

import { useState, useEffect } from "react";
import { X, Search, Forward } from "lucide-react";

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

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
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

interface ForwardModalProps {
  messageId: string;
  currentConversationId: string;
  onClose: () => void;
  onForwarded: () => void;
}

export default function ForwardModal({
  messageId,
  currentConversationId,
  onClose,
  onForwarded,
}: ForwardModalProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setConversations(data);
      })
      .catch(console.error);
  }, []);

  const filtered = conversations
    .filter((c) => c.id !== currentConversationId && c.otherUser)
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.otherUser?.name?.toLowerCase().includes(q) ||
        c.otherUser?.email.toLowerCase().includes(q)
      );
    });

  const handleForward = async (targetConversationId: string) => {
    setSending(targetConversationId);
    try {
      const res = await fetch("/api/messages/forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, targetConversationId }),
      });
      if (!res.ok) throw new Error("Forward failed");
      onForwarded();
      onClose();
    } catch {
      setSending(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/30 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[360px] max-h-[480px] flex flex-col bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-text-heading">Forward to</h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-bg-surface-weak transition-colors"
          >
            <X className="w-4 h-4 text-text-sub" strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-bg-page border border-border-primary">
            <Search className="w-3.5 h-3.5 text-text-placeholder shrink-0" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-xs bg-transparent outline-none text-text-main placeholder:text-text-placeholder"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-20">
              <span className="text-xs text-text-placeholder">No conversations found</span>
            </div>
          )}
          {filtered.map((conv) => {
            const user = conv.otherUser!;
            const colorIndex = user.name ? user.name.charCodeAt(0) % avatarColors.length : 0;
            const isSending = sending === conv.id;

            return (
              <button
                key={conv.id}
                onClick={() => handleForward(conv.id)}
                disabled={!!sending}
                className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-bg-surface-weak transition-colors text-left disabled:opacity-50"
              >
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? ""}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className={`w-9 h-9 rounded-full bg-linear-to-br ${avatarColors[colorIndex]} flex items-center justify-center text-white text-[11px] font-semibold shrink-0`}
                  >
                    {getInitials(user.name ?? user.email)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-text-heading truncate block">
                    {user.name ?? user.email}
                  </span>
                  <span className="text-[10px] text-text-placeholder truncate block">
                    {user.email}
                  </span>
                </div>
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <Forward className="w-4 h-4 text-text-soft shrink-0" strokeWidth={1.8} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
