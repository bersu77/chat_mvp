"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { X, Send, Trash2, Minus } from "lucide-react";
import StarFourIcon from "./icons/star-four";
import { useRef, useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AIChatAreaProps {
  onClose: () => void;
}

const chatTransport = new DefaultChatTransport({ api: "/api/chat" });

/** Extract all text from a UIMessage's parts array */
function getMessageText(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

export default function AIChatArea({ onClose }: AIChatAreaProps) {
  const { messages, sendMessage, setMessages, status } = useChat({
    transport: chatTransport,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage({ text });
  }, [input, isStreaming, sendMessage]);

  return (
    <div className="fixed bottom-4 left-2 md:bottom-4 md:left-[84px] z-50 w-[calc(100vw-1rem)] md:w-[380px] max-w-[380px] h-[min(520px,calc(100vh-3rem))] flex flex-col bg-bg-surface rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.15)] border border-border-primary animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-primary shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-linear-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
            <StarFourIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-text-heading leading-4">
              AI Assistant
            </span>
            <span className="text-[10px] text-text-success leading-3">
              Online
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              title="Clear chat"
              className="flex items-center justify-center w-7 h-7 rounded-lg text-text-soft hover:text-text-sub hover:bg-bg-surface-weak transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
            </button>
          )}
          <button
            onClick={onClose}
            title="Close"
            className="flex items-center justify-center w-7 h-7 rounded-lg text-text-soft hover:text-text-sub hover:bg-bg-surface-weak transition-colors"
          >
            <Minus className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-md">
              <StarFourIcon className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-text-heading">
                Chat with AI
              </h3>
              <p className="text-[11px] text-text-placeholder max-w-[220px] leading-3.5">
                Ask me anything — I can help with questions, writing, and more.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const text = getMessageText(msg.parts);

          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"} animate-message-in`}
            >
              <div className={`relative max-w-[82%] ${isUser ? "mr-0.5" : "ml-0.5"}`}>
                {/* Bubble tail */}
                {isUser ? (
                  <svg className="absolute -right-[6px] top-0 w-[6px] h-[11px] z-1" viewBox="0 0 7 13">
                    <path d="M0 0C3.5 0.5 7 2 7 7C5.5 5 3.5 4.5 0 13V0Z" fill="#f0fdf4" />
                  </svg>
                ) : (
                  <svg className="absolute -left-[6px] top-0 w-[6px] h-[11px] z-1" viewBox="0 0 7 13">
                    <path d="M7 0C3.5 0.5 0 2 0 7C1.5 5 3.5 4.5 7 13V0Z" fill="#f7f9fb" />
                  </svg>
                )}

                <div
                  className={`text-xs leading-[17px] px-2.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
                    isUser
                      ? "bg-bg-bubble-out text-text-main rounded-tl-xl rounded-bl-xl rounded-br-xl rounded-tr-[4px]"
                      : "bg-bg-surface-weak text-text-heading rounded-tr-xl rounded-br-xl rounded-bl-xl rounded-tl-[4px]"
                  }`}
                >
                  {isUser ? (
                    <span className="whitespace-pre-wrap">{text}</span>
                  ) : (
                    <div className="ai-markdown prose prose-xs max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {text}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Streaming indicator */}
        {isStreaming && messages.length > 0 && messages[messages.length - 1].role === "user" && (
          <div className="flex items-start animate-fade-in">
            <div className="bg-bg-surface-weak rounded-xl px-3 py-2.5 shadow-sm flex items-center gap-[3px] ml-0.5">
              <span className="typing-dot" />
              <span className="typing-dot [animation-delay:0.2s]" />
              <span className="typing-dot [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center px-2.5 pt-1.5 pb-2.5">
        <div className="flex-1 flex items-center gap-1 h-9 pl-3 pr-0.5 rounded-full border border-border-primary focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/20 transition-all duration-200">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask AI anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 text-xs text-text-main placeholder:text-text-soft bg-transparent outline-none leading-4"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-500 hover:bg-brand-600 text-white transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
