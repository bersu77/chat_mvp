"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";

function generateWaveform(seed: string, bars: number = 36): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Array.from({ length: bars }, (_, i) => {
    const x = Math.sin(hash * (i + 1) * 0.1) * 10000;
    return 0.15 + Math.abs(x - Math.floor(x)) * 0.85;
  });
}

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface VoicePlayerProps {
  src: string;
  messageId: string;
  isIncoming: boolean;
}

export default function VoicePlayer({ src, messageId, isIncoming }: VoicePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveform = generateWaveform(messageId);

  // Reset state when src changes (e.g., blob URL replaced with real URL)
  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setProgress(audio.currentTime / audio.duration);
        setCurrentTime(audio.currentTime);
      }
    };
    const onMeta = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    // Some browsers fire durationchange before/instead of loadedmetadata for webm
    const onDurationChange = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnd);
    };
  }, [src]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [playing]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !isFinite(audio.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = x * audio.duration;
    setProgress(x);
    setCurrentTime(x * audio.duration);
  }, []);

  return (
    <div className="flex items-center gap-2.5 min-w-[200px] max-w-[260px]">
      <audio ref={audioRef} src={src} preload="auto" />

      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isIncoming
            ? "bg-brand-500 text-white hover:bg-brand-600"
            : "bg-white/80 text-brand-500 hover:bg-white"
        }`}
      >
        {playing ? (
          <Pause className="w-3.5 h-3.5" strokeWidth={2.5} fill="currentColor" />
        ) : (
          <Play className="w-3.5 h-3.5 ml-0.5" strokeWidth={2.5} fill="currentColor" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div
          className="flex items-end gap-[1.5px] h-[22px] cursor-pointer"
          onClick={seek}
        >
          {waveform.map((h, i) => {
            const filled = i / waveform.length <= progress;
            return (
              <div
                key={i}
                className={`w-[2px] rounded-full transition-colors duration-100 ${
                  filled
                    ? isIncoming
                      ? "bg-brand-500"
                      : "bg-white/90"
                    : isIncoming
                      ? "bg-text-placeholder/30"
                      : "bg-white/30"
                }`}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>
        <span
          className={`text-[10px] leading-3 tabular-nums ${
            isIncoming ? "text-text-placeholder" : "text-text-main/50"
          }`}
        >
          {playing || progress > 0
            ? formatDuration(currentTime)
            : formatDuration(duration)}
        </span>
      </div>
    </div>
  );
}
