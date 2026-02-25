"use client";

import { useEffect, useState } from "react";

interface OgData {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  url: string;
}

const ogCache = new Map<string, OgData>();

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function LinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<OgData | null>(ogCache.get(url) ?? null);
  const [loading, setLoading] = useState(!ogCache.has(url));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (ogCache.has(url)) {
      setData(ogCache.get(url)!);
      setLoading(false);
      return;
    }

    let cancelled = false;

    fetch("/api/og", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
      .then((r) => r.json())
      .then((result: OgData) => {
        if (cancelled) return;
        ogCache.set(url, result);
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  // Don't render anything if error or no data
  if (error) return null;

  // Loading skeleton
  if (loading) {
    return (
      <div className="mt-1.5 w-full max-w-[280px] rounded-lg bg-bg-surface-weak overflow-hidden animate-pulse">
        <div className="h-[100px] bg-bg-senary" />
        <div className="p-2.5 flex flex-col gap-1.5">
          <div className="h-3 w-3/4 rounded bg-bg-senary" />
          <div className="h-2.5 w-full rounded bg-bg-senary" />
          <div className="h-2.5 w-1/2 rounded bg-bg-senary" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const domain = getDomain(url);
  const hasRichData = data.title || data.description || data.image;

  // Always show at least a domain card
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-1.5 block w-full max-w-[280px] rounded-lg bg-bg-surface-weak overflow-hidden hover:opacity-90 transition-opacity cursor-pointer"
    >
      {data.image && (
        <img
          src={data.image}
          alt={data.title ?? ""}
          className="w-full max-h-[160px] object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="p-2.5 flex flex-col gap-1">
        {data.title && (
          <span className="text-[11px] font-semibold text-text-heading leading-4 line-clamp-2">
            {data.title}
          </span>
        )}
        {data.description && (
          <span className="text-[10px] text-text-sub leading-3.5 line-clamp-2">
            {data.description}
          </span>
        )}
        <div className="flex items-center gap-1.5 mt-0.5">
          {data.favicon && (
            <img
              src={data.favicon}
              alt=""
              className="w-3.5 h-3.5 rounded-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <span className={`text-[10px] text-text-placeholder leading-3 ${!hasRichData ? "font-medium" : ""}`}>
            {domain}
          </span>
        </div>
      </div>
    </a>
  );
}
