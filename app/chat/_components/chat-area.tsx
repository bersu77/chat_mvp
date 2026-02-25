"use client";

import {
  Video,
  MoreHorizontal,
  Smile,
  Paperclip,
  Send,
  X,
  FileText,
  Image as ImageIcon,
  Film,
  Download,
  Loader2,
  CornerUpLeft,
  Pencil,
  Copy,
  Forward,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import CheckReadIcon from "./icons/check-read";
import SingleCheckIcon from "./icons/single-check";
import ClockPendingIcon from "./icons/clock-pending";
import SearchIcon from "./icons/search";
import PhoneIcon from "./icons/phone";
import MicIcon from "./icons/mic";
import { useState, useRef, useEffect, useCallback } from "react";
import { useChatChannel, type IncomingMessage } from "@/lib/use-apinator";
import { useUploadThing } from "@/lib/uploadthing";
import type { UserInfo } from "../page";
import ImageLightbox from "./image-lightbox";
import LinkPreview from "./link-preview";
import ForwardModal from "./forward-modal";
import VoicePlayer from "./voice-player";

type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";

interface ReplyToData {
  id: string;
  content: string;
  senderId: string;
  senderName?: string | null;
}

interface MessageData {
  id: string;
  content: string;
  type?: MessageType;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  isEdited?: boolean;
  isDeleted?: boolean;
  isForwarded?: boolean;
  isRead?: boolean;
  replyToId?: string | null;
  replyTo?: ReplyToData | null;
  senderId: string;
  senderName?: string | null;
  createdAt: string;
  /** Client-only: "pending" = not yet saved, "sent" = saved but unread, "read" = read by other party */
  _status?: "pending" | "sent" | "read";
  /** Client-only: blob URL for media being uploaded */
  _blobUrl?: string;
  /** Client-only: upload progress 0-100 */
  _uploadProgress?: number;
  /** Client-only: stable key for React — survives temp→saved replacement */
  _key?: string;
}

const headerActions: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}[] = [
  { icon: SearchIcon, label: "Search" },
  { icon: PhoneIcon, label: "Call" },
  { icon: Video, label: "Video" },
  { icon: MoreHorizontal, label: "More" },
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

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ChatAreaProps {
  conversationId: string | null;
  otherUser: UserInfo | null;
  currentUserId: string;
  currentUserName: string;
  isOtherUserOnline: boolean;
  onMessageSent: () => void;
  onBack?: () => void;
}

export default function ChatArea({
  conversationId,
  otherUser,
  currentUserId,
  currentUserName,
  isOtherUserOnline,
  onMessageSent,
  onBack,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: MessageData } | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageData | null>(null);
  const [editingMsg, setEditingMsg] = useState<MessageData | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<MessageData | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mark messages as read
  const markAsRead = useCallback((convId: string) => {
    fetch("/api/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: convId }),
    }).catch(() => {});
  }, []);

  const { typingUser, sendTyping } = useChatChannel(
    conversationId,
    {
      onNewMessage: useCallback(
        (msg: IncomingMessage) => {
          if (msg.senderId === currentUserId) return;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, { ...msg, _status: "sent" } as MessageData];
          });
          // Immediately mark as read since we're viewing this conversation
          if (conversationId) markAsRead(conversationId);
        },
        [currentUserId, conversationId, markAsRead]
      ),
      onMessageEdited: useCallback(
        (data: { id: string; content: string; isEdited: boolean }) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === data.id ? { ...m, content: data.content, isEdited: true } : m))
          );
        },
        []
      ),
      onMessageDeleted: useCallback(
        (data: { id: string }) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.id
                ? { ...m, content: "This message was deleted", isDeleted: true }
                : m
            )
          );
        },
        []
      ),
      onMessagesRead: useCallback(
        (data: { conversationId: string; readBy: string }) => {
          // The other user read our messages — mark all senders sent messages as read
          if (data.readBy !== currentUserId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.senderId === currentUserId ? { ...m, isRead: true, _status: "read" } : m
              )
            );
          }
        },
        [currentUserId]
      ),
    }
  );

  // Each upload type gets its own ref — no shared state between them
  const imageTempIdRef = useRef<string | null>(null);
  const videoTempIdRef = useRef<string | null>(null);

  // UploadThing hooks — inline media previews with progress overlay
  const { startUpload: startImageUpload, isUploading: isUploadingImage } =
    useUploadThing("chatImage", {
      onUploadProgress: (p) => {
        const tid = imageTempIdRef.current;
        if (tid) setMessages((prev) => prev.map((m) => m.id === tid ? { ...m, _uploadProgress: p } : m));
      },
      onClientUploadComplete: (res) => {
        const tid = imageTempIdRef.current;
        imageTempIdRef.current = null;
        setUploadProgress(null);
        if (res?.[0] && tid) {
          setMessages((prev) => prev.map((m) =>
            m.id === tid ? { ...m, fileUrl: res[0].url, _uploadProgress: undefined, _blobUrl: undefined } : m
          ));
          sendFileMessage("IMAGE", res[0].url, res[0].name, res[0].size, tid);
        }
      },
      onUploadError: () => {
        const tid = imageTempIdRef.current;
        imageTempIdRef.current = null;
        setUploadProgress(null);
        if (tid) setMessages((prev) => prev.filter((m) => m.id !== tid));
      },
    });

  const { startUpload: startVideoUpload, isUploading: isUploadingVideo } =
    useUploadThing("chatVideo", {
      onUploadProgress: (p) => {
        const tid = videoTempIdRef.current;
        if (tid) setMessages((prev) => prev.map((m) => m.id === tid ? { ...m, _uploadProgress: p } : m));
      },
      onClientUploadComplete: (res) => {
        const tid = videoTempIdRef.current;
        videoTempIdRef.current = null;
        setUploadProgress(null);
        if (res?.[0] && tid) {
          setMessages((prev) => prev.map((m) =>
            m.id === tid ? { ...m, fileUrl: res[0].url, _uploadProgress: undefined, _blobUrl: undefined } : m
          ));
          sendFileMessage("VIDEO", res[0].url, res[0].name, res[0].size, tid);
        }
      },
      onUploadError: () => {
        const tid = videoTempIdRef.current;
        videoTempIdRef.current = null;
        setUploadProgress(null);
        if (tid) setMessages((prev) => prev.filter((m) => m.id !== tid));
      },
    });

  const audioTempKeyRef = useRef<string | null>(null);
  const fileTempKeyRef = useRef<string | null>(null);

  const { startUpload: startAudioUpload, isUploading: isUploadingAudio } =
    useUploadThing("chatAudio", {
      onUploadProgress: (p) => {
        const tid = audioTempKeyRef.current;
        if (tid) setMessages((prev) => prev.map((m) => m.id === tid ? { ...m, _uploadProgress: p } : m));
      },
      onClientUploadComplete: (res) => {
        const tid = audioTempKeyRef.current;
        audioTempKeyRef.current = null;
        setUploadProgress(null);
        if (res?.[0]) {
          if (tid) {
            setMessages((prev) => prev.map((m) =>
              m.id === tid ? { ...m, fileUrl: res[0].url, _blobUrl: undefined, _uploadProgress: undefined } : m
            ));
            sendFileMessage("AUDIO", res[0].url, res[0].name, res[0].size, tid);
          } else {
            sendFileMessage("AUDIO", res[0].url, res[0].name, res[0].size);
          }
        }
      },
      onUploadError: () => {
        const tid = audioTempKeyRef.current;
        audioTempKeyRef.current = null;
        setUploadProgress(null);
        if (tid) setMessages((prev) => prev.filter((m) => m.id !== tid));
      },
    });

  const { startUpload: startFileUpload, isUploading: isUploadingFile } =
    useUploadThing("chatFile", {
      onUploadProgress: (p) => {
        const tid = fileTempKeyRef.current;
        if (tid) setMessages((prev) => prev.map((m) => m.id === tid ? { ...m, _uploadProgress: p } : m));
      },
      onClientUploadComplete: (res) => {
        const tid = fileTempKeyRef.current;
        fileTempKeyRef.current = null;
        setUploadProgress(null);
        if (res?.[0]) {
          if (tid) {
            setMessages((prev) => prev.map((m) =>
              m.id === tid ? { ...m, fileUrl: res[0].url, _uploadProgress: undefined } : m
            ));
            sendFileMessage("FILE", res[0].url, res[0].name, res[0].size, tid);
          } else {
            sendFileMessage("FILE", res[0].url, res[0].name, res[0].size);
          }
        }
      },
      onUploadError: () => {
        const tid = fileTempKeyRef.current;
        fileTempKeyRef.current = null;
        setUploadProgress(null);
        if (tid) setMessages((prev) => prev.filter((m) => m.id !== tid));
      },
    });

  const isUploading =
    isUploadingImage || isUploadingVideo || isUploadingAudio || isUploadingFile;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    }
    if (showAttachMenu) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showAttachMenu]);

  useEffect(() => {
    if (!contextMenu) return;
    function handleClick(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    function handleScroll() { setContextMenu(null); }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("scroll", handleScroll, true);
    };
  }, [contextMenu]);

  // Fetch messages when conversation changes + mark as read
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }
    // Immediately clear old messages and show skeleton
    setMessages([]);
    setLoadingMessages(true);
    fetch(`/api/messages/${conversationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(
            data.map((m: MessageData) => ({
              ...m,
              _status: m.isRead ? "read" : "sent",
            }))
          );
        }
      })
      .catch(console.error)
      .finally(() => setLoadingMessages(false));
    // Mark incoming messages as read when opening the conversation
    markAsRead(conversationId);
  }, [conversationId, markAsRead]);

  // Auto-scroll on new messages or typing indicator
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  // Send a file message to the API (also used for in-place update of existing temp messages)
  const sendFileMessage = useCallback(
    async (type: MessageType, fileUrl: string, fileName: string, fileSize: number, existingTempKey?: string) => {
      if (!conversationId) return;

      const tempKey = existingTempKey ?? `temp-${Date.now()}`;

      if (!existingTempKey) {
        // Only create a new temp if there's no existing one to update
        const tempMsg: MessageData = {
          id: tempKey,
          content: fileName,
          type,
          fileUrl,
          fileName,
          fileSize,
          senderId: currentUserId,
          senderName: currentUserName,
          createdAt: new Date().toISOString(),
          _status: "pending",
          _key: tempKey,
        };
        setMessages((prev) => [...prev, tempMsg]);
      }

      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, content: fileName, type, fileUrl, fileName, fileSize }),
        });
        if (!res.ok) throw new Error("send failed");
        const saved = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === tempKey || m._key === tempKey ? { ...saved, senderName: currentUserName, _status: "sent", _key: tempKey } : m))
        );
        onMessageSent();
      } catch {
        // Keep the temp message visible — the DB save may have succeeded
      }
    },
    [conversationId, currentUserId, currentUserName, onMessageSent]
  );

  // Send text message (or save edit)
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || !conversationId || sending) return;
    setSending(true);

    const content = inputValue.trim();
    setInputValue("");

    // --- Edit mode ---
    if (editingMsg) {
      const msgId = editingMsg.id;
      setEditingMsg(null);
      try {
        const res = await fetch("/api/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: msgId, content }),
        });
        if (!res.ok) throw new Error("edit failed");
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content, isEdited: true } : m))
        );
      } catch {
        // revert
      } finally {
        setSending(false);
      }
      return;
    }

    // --- Normal send (with optional reply) ---
    const tempKey = `temp-${Date.now()}`;
    const tempMsg: MessageData = {
      id: tempKey,
      content,
      type: "TEXT",
      senderId: currentUserId,
      senderName: currentUserName,
      createdAt: new Date().toISOString(),
      replyToId: replyingTo?.id ?? null,
      replyTo: replyingTo
        ? { id: replyingTo.id, content: replyingTo.content, senderId: replyingTo.senderId, senderName: replyingTo.senderName }
        : null,
      _status: "pending",
      _key: tempKey,
    };
    setMessages((prev) => [...prev, tempMsg]);
    const replyToId = replyingTo?.id;
    setReplyingTo(null);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content, replyToId }),
      });
      if (!res.ok) throw new Error("send failed");
      const saved = await res.json();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempKey ? { ...saved, senderName: currentUserName, _status: "sent", _key: tempKey } : m
        )
      );
      onMessageSent();
    } catch {
      // Keep the temp message visible
    } finally {
      setSending(false);
    }
  }, [inputValue, conversationId, sending, currentUserId, currentUserName, onMessageSent, editingMsg, replyingTo]);

  // Typing indicator
  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      sendTyping(currentUserName);
      typingTimeoutRef.current = setTimeout(() => {}, 2000);
    },
    [sendTyping, currentUserName]
  );

  // Voice recording — detect best supported MIME type
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Pick the best supported audio format
      const mimeTypes = [
        { mime: "audio/webm;codecs=opus", ext: "webm" },
        { mime: "audio/webm", ext: "webm" },
        { mime: "audio/ogg;codecs=opus", ext: "ogg" },
        { mime: "audio/mp4", ext: "mp4" },
      ];
      const supported = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t.mime));
      const mimeType = supported?.mime ?? "audio/webm";
      const ext = supported?.ext ?? "webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });

        setIsRecording(false);
        setRecordingDuration(0);
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);

        // Create temp message immediately with blob URL so user sees it right away
        const tempId = `temp-voice-${Date.now()}`;
        audioTempKeyRef.current = tempId;
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            content: file.name,
            type: "AUDIO" as MessageType,
            fileUrl: blobUrl,
            _blobUrl: blobUrl,
            _uploadProgress: 0,
            fileName: file.name,
            fileSize: blob.size,
            senderId: currentUserId,
            senderName: currentUserName,
            createdAt: new Date().toISOString(),
            _status: "pending",
            _key: tempId,
          },
        ]);

        await startAudioUpload([file]);
      };

      // Use timeslice to collect data in chunks during recording
      recorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      // Mic permission denied
    }
  }, [startAudioUpload, currentUserId, currentUserName]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  // File input handlers — create instant preview with blob URL
  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        const file = files[0];
        const blobUrl = URL.createObjectURL(file);
        const tempId = `temp-upload-${Date.now()}`;
        imageTempIdRef.current = tempId;
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            content: file.name,
            type: "IMAGE" as MessageType,
            fileUrl: blobUrl,
            _blobUrl: blobUrl,
            _uploadProgress: 0,
            _status: "pending",
            _key: tempId,
            fileName: file.name,
            fileSize: file.size,
            senderId: currentUserId,
            senderName: currentUserName,
            createdAt: new Date().toISOString(),
          },
        ]);
        startImageUpload(files);
      }
      e.target.value = "";
    },
    [startImageUpload, currentUserId, currentUserName]
  );

  const handleVideoSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        const file = files[0];
        const blobUrl = URL.createObjectURL(file);
        const tempId = `temp-upload-${Date.now()}`;
        videoTempIdRef.current = tempId;
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            content: file.name,
            type: "VIDEO" as MessageType,
            fileUrl: blobUrl,
            _blobUrl: blobUrl,
            _uploadProgress: 0,
            _status: "pending",
            _key: tempId,
            fileName: file.name,
            fileSize: file.size,
            senderId: currentUserId,
            senderName: currentUserName,
            createdAt: new Date().toISOString(),
          },
        ]);
        startVideoUpload(files);
      }
      e.target.value = "";
    },
    [startVideoUpload, currentUserId, currentUserName]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        const file = files[0];
        const tempId = `temp-file-${Date.now()}`;
        fileTempKeyRef.current = tempId;
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            content: file.name,
            type: "FILE" as MessageType,
            fileName: file.name,
            fileSize: file.size,
            senderId: currentUserId,
            senderName: currentUserName,
            createdAt: new Date().toISOString(),
            _status: "pending",
            _key: tempId,
            _uploadProgress: 0,
          },
        ]);
        startFileUpload(files);
      }
      e.target.value = "";
    },
    [startFileUpload, currentUserId, currentUserName]
  );

  // Message context menu handler
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, msg: MessageData) => {
      if (msg.isDeleted) return;
      e.preventDefault();
      console.log("[ctx] senderId:", msg.senderId, "currentUserId:", currentUserId, "match:", msg.senderId === currentUserId, "type:", msg.type);
      setContextMenu({ x: e.clientX, y: e.clientY, msg });
    },
    [currentUserId]
  );

  const handleReply = useCallback((msg: MessageData) => {
    setReplyingTo(msg);
    setContextMenu(null);
    setEditingMsg(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleEdit = useCallback((msg: MessageData) => {
    setEditingMsg(msg);
    setInputValue(msg.content);
    setContextMenu(null);
    setReplyingTo(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleCopy = useCallback((msg: MessageData) => {
    navigator.clipboard.writeText(msg.content);
    setContextMenu(null);
  }, []);

  const handleForward = useCallback((msg: MessageData) => {
    setForwardingMsg(msg);
    setContextMenu(null);
  }, []);

  const handleDelete = useCallback(
    async (msg: MessageData) => {
      setContextMenu(null);
      try {
        const res = await fetch("/api/messages", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: msg.id }),
        });
        if (!res.ok) throw new Error("delete failed");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id ? { ...m, content: "This message was deleted", isDeleted: true } : m
          )
        );
      } catch {
        // silent
      }
    },
    []
  );

  // Scroll to a replied message and highlight it
  const scrollToMessage = useCallback((msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMsgId(msgId);
    setTimeout(() => setHighlightedMsgId(null), 1500);
  }, []);

  // Render message content based on type
  function renderMessageContent(msg: MessageData, isIncoming: boolean) {
    const type = msg.type ?? "TEXT";

    if (type === "IMAGE" && msg.fileUrl) {
      return (
        <img
          src={msg.fileUrl}
          alt={msg.fileName ?? "Image"}
          className="max-w-[260px] max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition-opacity block"
          onClick={() => setLightboxUrl(msg.fileUrl!)}
        />
      );
    }

    if (type === "VIDEO" && msg.fileUrl) {
      return (
        <video
          src={msg.fileUrl}
          controls
          className="max-w-[300px] max-h-[220px] block"
          preload="metadata"
        />
      );
    }

    if (type === "AUDIO" && msg.fileUrl) {
      const uploading = msg._uploadProgress != null && msg._uploadProgress < 100;
      return (
        <div className="relative">
          <VoicePlayer src={msg.fileUrl} messageId={msg.id} isIncoming={isIncoming} />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
              <svg className="w-10 h-10" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="18" fill="none" stroke="white" strokeWidth="2.5" opacity="0.3" />
                <circle
                  cx="24" cy="24" r="18" fill="none" stroke="white" strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - (msg._uploadProgress ?? 0) / 100)}`}
                  transform="rotate(-90 24 24)"
                  className="transition-all duration-300"
                />
              </svg>
            </div>
          )}
        </div>
      );
    }

    if (type === "FILE") {
      const hasUrl = !!msg.fileUrl;
      const uploading = msg._uploadProgress != null && msg._uploadProgress < 100;
      const progressPct = msg._uploadProgress ?? 0;
      const Wrapper = hasUrl && !uploading ? "a" : "div";
      const wrapperProps = hasUrl && !uploading
        ? { href: msg.fileUrl!, target: "_blank", rel: "noopener noreferrer" }
        : {};
      return (
        <Wrapper
          {...wrapperProps}
          className="flex items-center gap-2.5 min-w-[180px] hover:opacity-80 transition-opacity"
        >
          {/* Circular progress icon or file icon */}
          <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
            {uploading ? (
              <>
                <svg className="w-10 h-10 absolute inset-0" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-100" />
                  <circle
                    cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 16}`}
                    strokeDashoffset={`${2 * Math.PI * 16 * (1 - progressPct / 100)}`}
                    transform="rotate(-90 20 20)"
                    className="text-brand-500 transition-all duration-300"
                  />
                </svg>
                <span className="text-[9px] font-semibold text-brand-500 z-10">{Math.round(progressPct)}%</span>
              </>
            ) : (
              <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-brand-500" strokeWidth={1.8} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="text-xs font-medium truncate">
              {msg.fileName ?? "File"}
            </span>
            <span className="text-[10px] text-text-placeholder">
              {uploading ? `${formatFileSize(Math.round((msg.fileSize ?? 0) * progressPct / 100))} / ${formatFileSize(msg.fileSize)}` : formatFileSize(msg.fileSize)}
            </span>
          </div>
          {hasUrl && !uploading && <Download className="w-3.5 h-3.5 text-text-sub shrink-0" strokeWidth={2} />}
        </Wrapper>
      );
    }

    // TEXT — detect URLs (with or without protocol) and render link previews
    // Matches https://... OR bare domains like abc.com/path
    const linkPattern =
      /https?:\/\/[^\s<>"{}|\\^`[\]]+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+(?:com|org|net|io|dev|co|me|app|xyz|info|biz|tv|gg|ai|so|sh|to|fm|ly|cc|us|uk|ca|de|fr|it|nl|au|in|br|ru|jp|cn|kr|se|no|fi|dk|pl|cz|ch|at|be|es|pt|ie|nz|za|mx|ar|cl|pe|tw|hk|sg|my|ph|th|id|vn|gov|edu|mil)(?:\/[^\s<>"{}|\\^`[\]]*)*/gi;
    const matches = msg.content.match(linkPattern);
    if (!matches) {
      return <span>{msg.content}</span>;
    }

    // Split content around all matched links
    const parts = msg.content.split(linkPattern);

    // Find the first full URL (with protocol) for the preview
    const firstFullUrl = matches.find((m) => /^https?:\/\//i.test(m));

    return (
      <div className="flex flex-col">
        <span>
          {parts.map((part, i) => (
            <span key={i}>
              {part}
              {matches[i] && (
                <a
                  href={
                    /^https?:\/\//i.test(matches[i])
                      ? matches[i]
                      : `https://${matches[i]}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline hover:text-blue-600 break-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  {matches[i]}
                </a>
              )}
            </span>
          ))}
        </span>
        {firstFullUrl && <LinkPreview url={firstFullUrl} />}
      </div>
    );
  }

  // Empty state
  if (!conversationId || !otherUser) {
    return (
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center bg-bg-surface rounded-3xl animate-fade-in">
        <div className="flex flex-col items-center gap-4 text-center px-8">
          <div className="w-20 h-20 rounded-full bg-bg-surface-weak flex items-center justify-center">
            <Send className="w-8 h-8 text-text-soft" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold text-text-heading">
            Select a conversation
          </h3>
          <p className="text-sm text-text-placeholder max-w-[280px]">
            Choose a contact from the list or start a new message to begin
            chatting
          </p>
        </div>
      </div>
    );
  }

  const colorIndex = otherUser.name
    ? otherUser.name.charCodeAt(0) % avatarColors.length
    : 0;

  return (
    <div className="relative flex-1 min-w-0 flex flex-col bg-bg-surface rounded-3xl overflow-hidden animate-fade-in">
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageSelect}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoSelect}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Header */}
      <div className="flex items-center gap-2 md:gap-3 px-3 md:px-6 py-3 shrink-0">
        {/* Back button — mobile only */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex md:hidden items-center justify-center w-8 h-8 -ml-1 rounded-lg hover:bg-bg-surface-weak transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-text-sub" strokeWidth={1.8} />
          </button>
        )}
        <button
          onClick={() => setShowContactInfo(!showContactInfo)}
          className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
        >
          {otherUser.image ? (
            <img
              src={otherUser.image}
              alt={otherUser.name ?? ""}
              className="w-10 h-10 rounded-full object-cover shadow-sm shrink-0"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full bg-linear-to-br ${avatarColors[colorIndex]} flex items-center justify-center text-white text-xs font-semibold shadow-sm shrink-0`}
            >
              {getInitials(otherUser.name ?? otherUser.email)}
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
            <span className="text-sm font-medium text-text-main leading-5 tracking-[-0.084px]">
              {otherUser.name ?? otherUser.email}
            </span>
            <span
              className={`text-xs font-medium leading-4 ${
                isOtherUserOnline
                  ? "text-text-success"
                  : "text-text-placeholder"
              }`}
            >
              {isOtherUserOnline ? "Online" : "Offline"}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1.5 md:gap-3">
          {headerActions.map(({ icon: Icon, label }) => (
            <button
              key={label}
              title={label}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border border-border-primary bg-bg-surface hover:bg-bg-surface-weak transition-colors duration-200 ${
                label === "Search" ? "hidden md:flex" : ""
              }`}
            >
              <Icon className="w-4 h-4 text-text-sub" />
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 min-h-0 flex flex-col gap-3 bg-bg-page rounded-2xl mx-1.5 md:mx-3 mb-0 p-2 md:p-3 overflow-y-auto">
        {!loadingMessages && (
          <div className="flex justify-center">
            <span className="px-3 py-1 bg-bg-surface rounded-full text-sm font-medium text-text-sub leading-5 tracking-[-0.084px] shadow-sm">
              Today
            </span>
          </div>
        )}

        {loadingMessages && (
          <div className="flex-1 flex flex-col gap-3 py-2">
            {/* Skeleton: alternating left/right chat bubbles */}
            <div className="flex justify-start animate-pulse">
              <div className="max-w-[55%] flex flex-col gap-1.5 ml-1.5">
                <div className="h-9 w-48 bg-bg-surface-weak rounded-tr-xl rounded-br-xl rounded-bl-xl rounded-tl-[4px]" />
                <div className="h-9 w-64 bg-bg-surface-weak rounded-xl" />
              </div>
            </div>
            <div className="flex justify-end animate-pulse">
              <div className="max-w-[55%] flex flex-col gap-1.5 mr-1.5 items-end">
                <div className="h-9 w-52 bg-green-50 rounded-tl-xl rounded-bl-xl rounded-br-xl rounded-tr-[4px]" />
              </div>
            </div>
            <div className="flex justify-start animate-pulse">
              <div className="max-w-[55%] flex flex-col gap-1.5 ml-1.5">
                <div className="h-9 w-40 bg-bg-surface-weak rounded-tr-xl rounded-br-xl rounded-bl-xl rounded-tl-[4px]" />
              </div>
            </div>
            <div className="flex justify-end animate-pulse">
              <div className="max-w-[55%] flex flex-col gap-1.5 mr-1.5 items-end">
                <div className="h-9 w-56 bg-green-50 rounded-tl-xl rounded-bl-xl rounded-br-xl rounded-tr-[4px]" />
                <div className="h-9 w-36 bg-green-50 rounded-xl" />
              </div>
            </div>
            <div className="flex justify-start animate-pulse">
              <div className="max-w-[55%] flex flex-col gap-1.5 ml-1.5">
                <div className="h-9 w-60 bg-bg-surface-weak rounded-tr-xl rounded-br-xl rounded-bl-xl rounded-tl-[4px]" />
                <div className="h-9 w-44 bg-bg-surface-weak rounded-xl" />
              </div>
            </div>
            <div className="flex justify-end animate-pulse">
              <div className="max-w-[55%] flex flex-col gap-1.5 mr-1.5 items-end">
                <div className="h-9 w-48 bg-green-50 rounded-tl-xl rounded-bl-xl rounded-br-xl rounded-tr-[4px]" />
              </div>
            </div>
          </div>
        )}

        {!loadingMessages && messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-text-placeholder">
              Send a message to start the conversation
            </p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isIncoming = msg.senderId !== currentUserId;
          const isConsecutive =
            index > 0 && messages[index - 1]?.senderId === msg.senderId;
          const showTail = !isConsecutive;
          const msgType = msg.type ?? "TEXT";
          const isMediaMsg = msgType === "IMAGE" || msgType === "VIDEO";
          const isFileOrAudio = msgType === "AUDIO" || msgType === "FILE";

          return (
            <div
              key={msg._key ?? msg.id}
              id={`msg-${msg.id}`}
              className={`flex ${
                isIncoming ? "justify-start" : "justify-end"
              } ${isConsecutive ? "" : "mt-1"} ${highlightedMsgId === msg.id ? "msg-highlight" : ""}`}
              onContextMenu={(e) => handleContextMenu(e, msg)}
            >
              <div className={`relative max-w-[85%] md:max-w-[70%] ${isIncoming ? "ml-1.5" : "mr-1.5"}`}>
                {/* Bubble tail — only on first message in a group */}
                {showTail && !msg.isDeleted && (
                  isIncoming ? (
                    <svg className="absolute -left-[7px] top-0 w-[7px] h-[13px] z-1" viewBox="0 0 7 13">
                      <path d="M7 0C3.5 0.5 0 2 0 7C1.5 5 3.5 4.5 7 13V0Z" fill="#ffffff" />
                    </svg>
                  ) : (
                    <svg className="absolute -right-[7px] top-0 w-[7px] h-[13px] z-1" viewBox="0 0 7 13">
                      <path d="M0 0C3.5 0.5 7 2 7 7C5.5 5 3.5 4.5 0 13V0Z" fill="#f0fdf4" />
                    </svg>
                  )
                )}

                {/* Forwarded label */}
                {msg.isForwarded && !msg.isDeleted && (
                  <div className={`flex items-center gap-1 px-1 mb-0.5 ${isIncoming ? "" : "flex-row-reverse"}`}>
                    <Forward className="w-3 h-3 text-text-placeholder" strokeWidth={1.8} />
                    <span className="text-[10px] text-text-placeholder italic">Forwarded</span>
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`relative overflow-hidden text-xs leading-[18px] ${
                    msg.isDeleted
                      ? "px-3 py-2 bg-bg-surface-weak text-text-placeholder italic rounded-xl"
                      : isMediaMsg
                        ? "" /* no padding for images/videos — edge-to-edge */
                        : isFileOrAudio
                          ? "px-3 py-2"
                          : "px-3 py-1.5"
                  } ${
                    !msg.isDeleted && (
                      isIncoming
                        ? `bg-bg-surface text-text-heading ${
                            showTail
                              ? "rounded-tr-xl rounded-br-xl rounded-bl-xl rounded-tl-[4px]"
                              : "rounded-xl"
                          }`
                        : `bg-bg-bubble-out text-text-main ${
                            showTail
                              ? "rounded-tl-xl rounded-bl-xl rounded-br-xl rounded-tr-[4px]"
                              : "rounded-xl"
                          }`
                    )
                  } shadow-[0_1px_2px_rgba(0,0,0,0.04)]`}
                >
                  {/* Reply preview inside bubble — clickable to scroll */}
                  {msg.replyTo && !msg.isDeleted && (
                    <div
                      className={`${isMediaMsg ? "mx-2 mt-2" : ""} mb-1 px-2 py-1 rounded-md border-l-2 border-brand-500 bg-black/4 cursor-pointer hover:bg-black/[0.07] transition-colors`}
                      onClick={() => scrollToMessage(msg.replyTo!.id)}
                    >
                      <span className="font-medium text-brand-500 text-[10px] block leading-3">
                        {msg.replyTo.senderId === currentUserId ? "You" : (msg.replyTo.senderName ?? "User")}
                      </span>
                      <span className="text-text-sub text-[10px] leading-3 block truncate max-w-[200px]">{msg.replyTo.content}</span>
                    </div>
                  )}

                  {msg.isDeleted ? (
                    <span className="flex items-center gap-1.5">
                      <Trash2 className="w-3 h-3" strokeWidth={1.8} />
                      This message was deleted
                    </span>
                  ) : isMediaMsg ? (
                    /* Image / Video — edge-to-edge with overlay time badge + upload progress */
                    <div className="relative">
                      {renderMessageContent(msg, isIncoming)}
                      {/* Upload progress overlay */}
                      {msg._uploadProgress != null && msg._uploadProgress < 100 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <svg className="w-12 h-12" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="white" strokeWidth="2.5" opacity="0.3" />
                            <circle
                              cx="24" cy="24" r="20" fill="none" stroke="white" strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 20}`}
                              strokeDashoffset={`${2 * Math.PI * 20 * (1 - (msg._uploadProgress ?? 0) / 100)}`}
                              transform="rotate(-90 24 24)"
                              className="transition-all duration-300"
                            />
                          </svg>
                        </div>
                      )}
                      {/* Time overlay on media */}
                      <span className="absolute bottom-1.5 right-2 flex items-center gap-1 text-[10px] leading-3 whitespace-nowrap text-white bg-black/40 px-1.5 py-0.5 rounded-full">
                        {msg.isEdited && <span className="italic">edited</span>}
                        {formatTime(msg.createdAt)}
                        {!isIncoming && (
                          msg._status === "pending"
                            ? <ClockPendingIcon className="w-3 h-3 text-white/70" />
                            : msg._status === "read" || msg.isRead
                              ? <CheckReadIcon className="w-3 h-3 text-white/90" />
                              : <SingleCheckIcon className="w-3 h-3 text-white/90" />
                        )}
                      </span>
                    </div>
                  ) : (
                    /* Text / File / Audio — normal layout with inline time */
                    <>
                      {renderMessageContent(msg, isIncoming)}
                      <span className="inline-block w-18 h-0 align-bottom" aria-hidden="true">
                        {msg.isEdited && "\u00A0\u00A0\u00A0\u00A0"}
                      </span>
                      <span
                        className={`absolute bottom-1 right-2 flex items-center gap-1 text-[10px] leading-3 whitespace-nowrap ${
                          isIncoming ? "text-text-sub/60" : "text-text-main/50"
                        }`}
                      >
                        {msg.isEdited && !msg.isDeleted && <span className="italic">edited</span>}
                        {formatTime(msg.createdAt)}
                        {!isIncoming && (
                          msg._status === "pending"
                            ? <ClockPendingIcon className="w-3 h-3 text-text-placeholder" />
                            : msg._status === "read" || msg.isRead
                              ? <CheckReadIcon className="w-3 h-3 text-brand-500/70" />
                              : <SingleCheckIcon className="w-3 h-3 text-text-sub/60" />
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Upload progress indicator — only shown when no temp message preview exists */}
        {uploadProgress && !imageTempIdRef.current && !videoTempIdRef.current && !audioTempKeyRef.current && !fileTempKeyRef.current && (
          <div className="flex items-end animate-fade-in">
            <div className="flex items-center gap-2 bg-bg-bubble-out rounded-xl px-3 py-3 text-xs text-text-sub shadow-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
              {uploadProgress}
            </div>
          </div>
        )}

        {/* Typing indicator — iMessage-style bouncing dots */}
        {typingUser && (
          <div className="flex items-start animate-fade-in">
            <div className="bg-bg-surface rounded-2xl px-4 py-3 shadow-sm flex items-center gap-[3px]">
              <span className="typing-dot" />
              <span className="typing-dot [animation-delay:0.2s]" />
              <span className="typing-dot [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply / Edit bar */}
      {(replyingTo || editingMsg) && (
        <div className="flex items-center gap-3 mx-3 px-4 py-2 bg-bg-surface-weak rounded-t-xl border-l-2 border-brand-500">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-semibold text-brand-500 block">
              {editingMsg ? "Editing" : `Replying to ${replyingTo!.senderId === currentUserId ? "yourself" : (replyingTo!.senderName ?? "User")}`}
            </span>
            <span className="text-[11px] text-text-sub truncate block">
              {editingMsg?.content ?? replyingTo?.content}
            </span>
          </div>
          <button
            onClick={() => { setReplyingTo(null); setEditingMsg(null); setInputValue(""); }}
            className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-bg-senary transition-colors shrink-0"
          >
            <X className="w-3 h-3 text-text-sub" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-center px-1.5 md:px-3 pt-2 pb-3">
        <div className="flex-1 flex items-center gap-1 h-10 pl-4 pr-1 rounded-full border border-border-primary focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/20 transition-all duration-200">
          {isRecording ? (
            /* Recording UI */
            <div className="flex-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-500 font-medium tabular-nums">
                {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, "0")}
              </span>
              <span className="text-xs text-text-placeholder">Recording...</span>
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              placeholder={editingMsg ? "Edit message..." : "Type any message..."}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              className="flex-1 text-xs text-text-main placeholder:text-text-soft bg-transparent outline-none leading-4"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
                if (e.key === "Escape") {
                  setReplyingTo(null);
                  setEditingMsg(null);
                  setInputValue("");
                }
              }}
              disabled={isUploading}
            />
          )}
          <div className="flex items-center gap-1">
            {/* Voice button */}
            <button
              title={isRecording ? "Stop recording" : "Record voice"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isUploading}
              className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                isRecording
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "hover:bg-bg-surface-weak"
              }`}
            >
              {isRecording ? (
                <X className="w-3 h-3" strokeWidth={2.5} />
              ) : (
                <MicIcon className="w-3.5 h-3.5 text-text-sub" />
              )}
            </button>

            {/* Emoji */}
            <button
              title="Emoji"
              className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-bg-surface-weak transition-colors"
            >
              <Smile className="w-3.5 h-3.5 text-text-sub" strokeWidth={1.8} />
            </button>

            {/* Attach — with dropdown menu */}
            <div className="relative" ref={attachMenuRef}>
              <button
                title="Attach"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                disabled={isUploading || isRecording}
                className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-bg-surface-weak transition-colors disabled:opacity-50"
              >
                <Paperclip
                  className="w-3.5 h-3.5 text-text-sub"
                  strokeWidth={1.8}
                />
              </button>

              {showAttachMenu && (
                <div className="absolute bottom-8 right-0 z-30 flex flex-col w-[160px] p-1.5 bg-white border border-border-primary rounded-xl shadow-[0px_0px_24px_rgba(0,0,0,0.08)] animate-fade-in">
                  <button
                    onClick={() => {
                      setShowAttachMenu(false);
                      imageInputRef.current?.click();
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-bg-surface-weak transition-colors text-left"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-500" strokeWidth={1.8} />
                    <span className="text-xs font-medium text-text-heading">Image</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAttachMenu(false);
                      videoInputRef.current?.click();
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-bg-surface-weak transition-colors text-left"
                  >
                    <Film className="w-4 h-4 text-blue-500" strokeWidth={1.8} />
                    <span className="text-xs font-medium text-text-heading">Video</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowAttachMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-bg-surface-weak transition-colors text-left"
                  >
                    <FileText className="w-4 h-4 text-amber-500" strokeWidth={1.8} />
                    <span className="text-xs font-medium text-text-heading">Document</span>
                  </button>
                </div>
              )}
            </div>

            {/* Send */}
            {isRecording ? (
              <button
                title="Send voice"
                onClick={stopRecording}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-500 hover:bg-brand-600 text-white transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md"
              >
                <Send className="w-4 h-4" strokeWidth={2} />
              </button>
            ) : (
              <button
                title="Send"
                onClick={handleSend}
                disabled={(!inputValue.trim() && !isUploading) || sending}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-500 hover:bg-brand-600 text-white transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-70 flex flex-col w-[160px] p-1.5 bg-white border border-border-primary rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] animate-fade-in"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 220),
            left: Math.min(contextMenu.x, window.innerWidth - 180),
          }}
        >
          <button
            onClick={() => handleReply(contextMenu.msg)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-bg-surface-weak transition-colors text-left"
          >
            <CornerUpLeft className="w-3.5 h-3.5 text-text-sub" strokeWidth={2} />
            <span className="text-xs font-medium text-text-heading">Reply</span>
          </button>

          {contextMenu.msg.senderId === currentUserId && (contextMenu.msg.type ?? "TEXT") === "TEXT" && (
            <button
              onClick={() => handleEdit(contextMenu.msg)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-bg-surface-weak transition-colors text-left"
            >
              <Pencil className="w-3.5 h-3.5 text-text-sub" strokeWidth={2} />
              <span className="text-xs font-medium text-text-heading">Edit</span>
            </button>
          )}

          {(contextMenu.msg.type ?? "TEXT") === "TEXT" && (
            <button
              onClick={() => handleCopy(contextMenu.msg)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-bg-surface-weak transition-colors text-left"
            >
              <Copy className="w-3.5 h-3.5 text-text-sub" strokeWidth={2} />
              <span className="text-xs font-medium text-text-heading">Copy</span>
            </button>
          )}

          <button
            onClick={() => handleForward(contextMenu.msg)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-bg-surface-weak transition-colors text-left"
          >
            <Forward className="w-3.5 h-3.5 text-text-sub" strokeWidth={2} />
            <span className="text-xs font-medium text-text-heading">Forward</span>
          </button>

          {contextMenu.msg.senderId === currentUserId && (
            <button
              onClick={() => handleDelete(contextMenu.msg)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-red-50 transition-colors text-left"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" strokeWidth={2} />
              <span className="text-xs font-medium text-red-500">Delete</span>
            </button>
          )}
        </div>
      )}

      {/* Forward modal */}
      {forwardingMsg && conversationId && (
        <ForwardModal
          messageId={forwardingMsg.id}
          currentConversationId={conversationId}
          onClose={() => setForwardingMsg(null)}
          onForwarded={onMessageSent}
        />
      )}

      {/* Contact Info Sidebar */}
      {showContactInfo && (
        <ContactInfoPanel
          otherUser={otherUser}
          isOtherUserOnline={isOtherUserOnline}
          colorIndex={colorIndex}
          messages={messages}
          onClose={() => setShowContactInfo(false)}
          onImageClick={setLightboxUrl}
        />
      )}

      {lightboxUrl && (
        <ImageLightbox
          src={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </div>
  );
}

/* --- Contact Info Panel --- */

type ContactTab = "Media" | "Link" | "Docs";

// Extract URLs from text content
function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  return text.match(urlRegex) ?? [];
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function ContactInfoPanel({
  otherUser,
  isOtherUserOnline,
  colorIndex,
  messages,
  onClose,
  onImageClick,
}: {
  otherUser: UserInfo;
  isOtherUserOnline: boolean;
  colorIndex: number;
  messages: MessageData[];
  onClose: () => void;
  onImageClick: (url: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<ContactTab>("Media");

  // Filter messages by type for each tab
  const mediaMessages = messages.filter(
    (m) => (m.type === "IMAGE" || m.type === "VIDEO") && m.fileUrl
  );

  const linkMessages = messages.flatMap((m) => {
    if (m.type !== "TEXT") return [];
    const urls = extractUrls(m.content);
    return urls.map((url) => ({ id: m.id, url, domain: getDomain(url), createdAt: m.createdAt }));
  });

  const docMessages = messages.filter(
    (m) => m.type === "FILE" && m.fileUrl
  );

  return (
    <div className="fixed right-3 top-3 bottom-6 z-50 w-[380px] flex flex-col bg-white rounded-2xl shadow-[0px_1px_14px_1px_rgba(18,18,18,0.1)] animate-fade-in">
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <h2 className="text-lg font-semibold text-text-heading leading-7">
          Contact Info
        </h2>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-bg-surface-weak transition-colors"
        >
          <X className="w-5 h-5 text-text-sub" strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Profile */}
        <div className="flex flex-col items-center gap-2 mb-6">
          {otherUser.image ? (
            <img
              src={otherUser.image}
              alt={otherUser.name ?? ""}
              className="w-20 h-20 rounded-full object-cover shadow-sm"
            />
          ) : (
            <div
              className={`w-20 h-20 rounded-full bg-linear-to-br ${avatarColors[colorIndex]} flex items-center justify-center text-white text-2xl font-semibold shadow-sm`}
            >
              {getInitials(otherUser.name ?? otherUser.email)}
            </div>
          )}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-base font-semibold text-text-heading leading-6">
              {otherUser.name ?? otherUser.email}
            </span>
            <span className="text-sm text-text-placeholder leading-5">
              {otherUser.email}
            </span>
            <span
              className={`text-xs font-medium mt-1 ${
                isOtherUserOnline ? "text-text-success" : "text-text-placeholder"
              }`}
            >
              {isOtherUserOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        {/* Call buttons */}
        <div className="flex items-center gap-3 mb-6">
          <button className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border border-stroke-soft hover:bg-bg-surface-weak transition-colors">
            <PhoneIcon className="w-4 h-4 text-text-main" />
            <span className="text-sm font-medium text-text-main leading-5">Audio</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border border-stroke-soft hover:bg-bg-surface-weak transition-colors">
            <Video className="w-4 h-4 text-text-main" strokeWidth={1.8} />
            <span className="text-sm font-medium text-text-main leading-5">Video</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 bg-bg-page rounded-lg p-1 w-fit">
          {(["Media", "Link", "Docs"] as ContactTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium leading-5 transition-all duration-200 ${
                activeTab === tab
                  ? "bg-white text-text-heading shadow-sm"
                  : "text-text-soft hover:text-text-sub"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Media tab — images & videos */}
        {activeTab === "Media" && (
          <div className="flex flex-col gap-2">
            {mediaMessages.length === 0 ? (
              <div className="flex items-center justify-center h-24 rounded-lg bg-bg-page">
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="w-6 h-6 text-text-soft" strokeWidth={1.5} />
                  <span className="text-xs text-text-placeholder">No media shared yet</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {mediaMessages.map((msg) => (
                  <div key={msg.id} className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer">
                    {msg.type === "IMAGE" ? (
                      <img
                        src={msg.fileUrl!}
                        alt={msg.fileName ?? ""}
                        className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                        onClick={() => onImageClick(msg.fileUrl!)}
                      />
                    ) : (
                      <div
                        className="w-full h-full bg-slate-900 flex items-center justify-center group-hover:opacity-80 transition-opacity"
                        onClick={() => window.open(msg.fileUrl!, "_blank")}
                      >
                        <Film className="w-6 h-6 text-white/70" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Link tab — URLs extracted from text messages */}
        {activeTab === "Link" && (
          <div className="flex flex-col gap-2">
            {linkMessages.length === 0 ? (
              <div className="flex items-center justify-center h-24 rounded-lg bg-bg-page">
                <div className="flex flex-col items-center gap-1">
                  <Paperclip className="w-6 h-6 text-text-soft" strokeWidth={1.5} />
                  <span className="text-xs text-text-placeholder">No links shared yet</span>
                </div>
              </div>
            ) : (
              linkMessages.map((link, i) => (
                <a
                  key={`${link.id}-${i}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-bg-surface-weak transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-bg-surface-weak flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${link.domain}&sz=64`}
                      alt={link.domain}
                      className="w-6 h-6"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-text-heading leading-4 truncate">
                      {link.domain}
                    </span>
                    <span className="text-[10px] text-text-placeholder leading-3 truncate">
                      {link.url}
                    </span>
                  </div>
                </a>
              ))
            )}
          </div>
        )}

        {/* Docs tab — file attachments */}
        {activeTab === "Docs" && (
          <div className="flex flex-col gap-2">
            {docMessages.length === 0 ? (
              <div className="flex items-center justify-center h-24 rounded-lg bg-bg-page">
                <div className="flex flex-col items-center gap-1">
                  <FileText className="w-6 h-6 text-text-soft" strokeWidth={1.5} />
                  <span className="text-xs text-text-placeholder">No documents shared yet</span>
                </div>
              </div>
            ) : (
              docMessages.map((msg) => (
                <a
                  key={msg.id}
                  href={msg.fileUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-surface-weak transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-bg-page flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-text-sub" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-text-heading leading-5 truncate">
                      {msg.fileName ?? "File"}
                    </span>
                    <span className="text-xs text-text-placeholder leading-4">
                      {formatFileSize(msg.fileSize)}
                    </span>
                  </div>
                  <Download className="w-4 h-4 text-text-sub shrink-0" strokeWidth={1.8} />
                </a>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
