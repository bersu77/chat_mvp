"use client";

import { Trash2, Plus, MessageSquare } from "lucide-react";
import StarFourIcon from "./icons/star-four";

export interface AiSession {
  id: string;
  title: string;
  updatedAt: string;
}

interface AIChatSessionsProps {
  sessions: AiSession[];
  loading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function AIChatSessions({
  sessions,
  loading,
  onSelect,
  onNew,
  onDelete,
}: AIChatSessionsProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header — only show when sessions exist */}
      {!loading && sessions.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs font-semibold text-text-heading">
            Your Chats
          </span>
          <button
            onClick={onNew}
            className="flex items-center gap-1 text-[11px] font-medium text-brand-500 hover:text-brand-600 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            New Chat
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center animate-fade-in">
            <button
              onClick={onNew}
              className="w-12 h-12 rounded-xl bg-linear-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              <Plus className="w-6 h-6 text-white" strokeWidth={2} />
            </button>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-text-heading">
                No chats yet
              </h3>
              <p className="text-[11px] text-text-placeholder max-w-[200px] leading-3.5">
                Start a new conversation with AI assistant
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelect(s.id)}
                className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-bg-surface-weak transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-bg-surface-weak group-hover:bg-bg-surface flex items-center justify-center shrink-0">
                  <MessageSquare
                    className="w-4 h-4 text-text-soft"
                    strokeWidth={1.8}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-heading truncate leading-4">
                    {s.title}
                  </p>
                  <p className="text-[10px] text-text-placeholder leading-3 mt-0.5">
                    {relativeTime(s.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(s.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded-md text-text-soft hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
