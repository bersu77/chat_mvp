"use client";

import { ChevronLeft, Loader2, Pencil, X } from "lucide-react";
import GiftIcon from "./icons/gift";
import SunIcon from "./icons/sun";
import LogoutIcon from "./icons/logout";
import PencilEditIcon from "./icons/pencil-edit";
import HomeIcon from "./icons/home";
import ChatCircleIcon from "./icons/chat-circle";
import CompassIcon from "./icons/compass";
import FolderIcon from "./icons/folder";
import ImagesIcon from "./icons/images";
import StarFourIcon from "./icons/star-four";
import { signOut } from "next-auth/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useUploadThing } from "@/lib/uploadthing";

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

const navItems: { icon: React.ComponentType<{ className?: string }>; label: string; active: boolean }[] = [
  { icon: HomeIcon, label: "Home", active: true },
  { icon: ChatCircleIcon, label: "Messages", active: false },
  { icon: CompassIcon, label: "Explore", active: false },
  { icon: FolderIcon, label: "Files", active: false },
  { icon: ImagesIcon, label: "Media", active: false },
];

interface SidebarProps {
  userAvatar?: string;
  userName?: string;
  userEmail?: string;
  onAvatarUpdated?: () => void;
}

export default function Sidebar({ userAvatar, userName, userEmail, onAvatarUpdated }: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("avatarUploader", {
    onClientUploadComplete: () => {
      onAvatarUpdated?.();
    },
  });

  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) startUpload(files);
      e.target.value = "";
    },
    [startUpload]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (menuOpen || profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, profileOpen]);

  return (
    <aside className="relative flex flex-col items-center justify-between px-4 py-6 h-full shrink-0 w-[76px]">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      <div className="flex flex-col items-center gap-8">
        <button
          onClick={() => { setMenuOpen(!menuOpen); setProfileOpen(false); }}
          className="flex items-center justify-center w-11 h-11 transition-transform hover:scale-105"
        >
          <img src="/logo.svg" alt="Logo" className="w-11 h-11" />
        </button>

        {/* Nav icons */}
        <nav className="flex flex-col gap-2">
          {navItems.map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              title={label}
              className={`flex items-center justify-center w-11 h-11 rounded-lg transition-all duration-200 ${
                active
                  ? "bg-[#F0FDF4] border border-brand-500 text-text-main"
                  : "text-text-soft hover:bg-bg-senary/40 hover:text-text-sub"
              }`}
            >
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-5">
        <button
          title="AI"
          className="flex items-center justify-center w-11 h-11 rounded-lg text-text-soft hover:bg-bg-senary/40 hover:text-text-sub transition-all duration-200"
        >
          <StarFourIcon className="w-5 h-5 font-extrabold" />
        </button>

        <button
          onClick={() => { setProfileOpen(!profileOpen); setMenuOpen(false); }}
          className="w-11 h-11 rounded-full overflow-hidden bg-bg-surface-weak ring-2 ring-border-primary hover:ring-brand-500 transition-all duration-200"
        >
          {userAvatar ? (
            <img
              src={userAvatar}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-linear-to-br ${avatarColors[getColorIndex(userName)]} flex items-center justify-center text-white font-semibold text-sm`}>
              {getInitials(userName)}
            </div>
          )}
        </button>
      </div>

      {profileOpen && (
        <div
          ref={profileRef}
          className="absolute left-4 bottom-4 z-50 flex flex-col w-[300px] bg-white rounded-2xl shadow-[0px_1px_14px_1px_rgba(18,18,18,0.1)] animate-fade-in"
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h3 className="text-sm font-semibold text-text-heading leading-5">
              My Profile
            </h3>
            <button
              onClick={() => setProfileOpen(false)}
              className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-bg-surface-weak transition-colors"
            >
              <X className="w-4 h-4 text-text-soft" strokeWidth={2} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-3 px-5 pt-2 pb-5">
            <div className="relative group">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName ?? "Profile"}
                  className="w-[72px] h-[72px] rounded-full object-cover shadow-sm"
                />
              ) : (
                <div className={`w-[72px] h-[72px] rounded-full bg-linear-to-br ${avatarColors[getColorIndex(userName)]} flex items-center justify-center text-white text-2xl font-semibold shadow-sm`}>
                  {getInitials(userName)}
                </div>
              )}

              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-500 border-2 border-white flex items-center justify-center text-white hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                )}
              </button>
            </div>

            {/* Name & email */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-base font-semibold text-text-heading leading-6">
                {userName ?? "User"}
              </span>
              <span className="text-xs text-text-placeholder leading-4">
                {userEmail ?? "user@email.com"}
              </span>
            </div>

            {isUploading && (
              <span className="text-[10px] text-brand-500 font-medium animate-pulse">
                Uploading new avatar...
              </span>
            )}
          </div>

          <div className="h-px bg-border-primary" />

          <div className="flex flex-col px-1 py-1">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 w-full p-2 mx-1 rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <LogoutIcon className="w-4 h-4 text-text-heading" />
              <span className="text-sm font-medium text-text-heading tracking-[-0.14px] leading-5">
                Log out
              </span>
            </button>
          </div>
        </div>
      )}

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute left-4 top-[74px] z-50 flex flex-col w-[307px] py-1 gap-1 bg-white rounded-2xl shadow-[0px_1px_13.8px_1px_rgba(18,18,18,0.1)] animate-fade-in"
        >
          <div className="flex flex-col px-1">
            <div className="flex flex-col gap-1 p-1 rounded-xl">
              <button
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 w-full p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-bg-page">
                  <ChevronLeft className="w-4 h-4 text-text-heading" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-[#09090b] tracking-[-0.14px] leading-5">
                  Go back to dashboard
                </span>
              </button>

              <button className="flex items-center gap-2 w-full p-1.5 rounded-lg bg-bg-tertiary">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-white">
                  <PencilEditIcon className="w-4 h-4 text-text-heading" />
                </div>
                <span className="text-sm font-medium text-[#09090b] tracking-[-0.14px] leading-5">
                  Rename file
                </span>
              </button>
            </div>
          </div>

          <div className="h-px bg-border-primary mx-0" />

          <div className="flex flex-col px-1">
            <div className="flex items-center gap-3 p-2 rounded-lg">
              <div className="flex-1 flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-text-heading leading-5 tracking-[-0.14px]">
                  {userName ?? "User"}
                </p>
                <p className="text-xs text-text-placeholder leading-1.5 tracking-[-0.12px]">
                  {userEmail ?? "user@email.com"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="px-2.5">
              <div className="flex flex-col gap-2 bg-bg-tertiary p-2 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="flex-1 flex flex-col gap-0.5">
                    <p className="text-xs text-text-placeholder leading-[18px]">Credits</p>
                    <p className="text-sm font-medium text-[#09090b] leading-5">20 left</p>
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5 items-end text-right">
                    <p className="text-xs text-text-placeholder leading-[18px]">Renews in</p>
                    <p className="text-sm font-medium text-[#09090b] leading-5">6h 24m</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-2 w-full bg-bg-senary rounded-full overflow-hidden">
                    <div className="h-full w-[60%] bg-brand-500 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#5f5f5d] leading-5 tracking-[-0.12px]">
                      5 of 25 used today
                    </span>
                    <span className="text-xs text-brand-500 leading-[18px]">
                      +25 tomorrow
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-border-primary mx-0" />
          </div>

          <div className="flex flex-col px-1">
            <div className="flex flex-col gap-1 p-1 rounded-xl">
              <button className="flex items-center gap-2 w-full p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-bg-page">
                  <GiftIcon className="w-4 h-4 text-text-heading" />
                </div>
                <span className="text-sm font-medium text-text-heading tracking-[-0.14px] leading-5">
                  Win free credits
                </span>
              </button>

              <button className="flex items-center gap-2 w-full p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-bg-page">
                  <SunIcon className="w-4 h-4 text-text-heading" />
                </div>
                <span className="text-sm font-medium text-text-heading tracking-[-0.14px] leading-5">
                  Theme Style
                </span>
              </button>
            </div>
          </div>

          <div className="h-px bg-border-primary mx-0" />

          <div className="flex flex-col px-1">
            <div className="flex flex-col gap-1 p-1 rounded-xl">
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-2 w-full p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-bg-page">
                  <LogoutIcon className="w-4 h-4 text-text-heading" />
                </div>
                <span className="text-sm font-medium text-text-heading tracking-[-0.14px] leading-5">
                  Log out
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
