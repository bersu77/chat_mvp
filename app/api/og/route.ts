import { NextResponse } from "next/server";

interface OgData {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  url: string;
}

function extractMeta(html: string, property: string): string | null {
  // Find all <meta ...> tags, then check attributes inside
  const metaTagRegex = /<meta\s[^>]*?>/gi;
  let tag: RegExpExecArray | null;
  while ((tag = metaTagRegex.exec(html)) !== null) {
    const t = tag[0];
    // Check if this tag has the property or name we want
    const propMatch = t.match(
      /(?:property|name)\s*=\s*["']([^"']*)["']/i
    );
    if (propMatch && propMatch[1].toLowerCase() === property.toLowerCase()) {
      const contentMatch = t.match(/content\s*=\s*["']([^"']*)["']/i);
      return contentMatch?.[1] ?? null;
    }
  }
  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim() ?? null;
}

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url: string };

    // Validate URL
    let parsed: URL;
    try {
      parsed = new URL(url);
      if (!parsed.protocol.startsWith("http")) {
        return NextResponse.json({ title: null, description: null, image: null, favicon: null, url });
      }
    } catch {
      return NextResponse.json({ title: null, description: null, image: null, favicon: null, url });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);

    // Only parse HTML responses
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json({
        title: parsed.hostname,
        description: null,
        image: null,
        favicon: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`,
        url,
      } satisfies OgData);
    }

    // Only read first 50KB — OG tags are in <head>
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let bytesRead = 0;
      while (bytesRead < 50_000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        bytesRead += value.length;
      }
      reader.cancel();
    } else {
      html = (await res.text()).slice(0, 50_000);
    }

    const ogTitle = extractMeta(html, "og:title") ?? extractTitle(html);
    const ogDescription =
      extractMeta(html, "og:description") ?? extractMeta(html, "description");
    let ogImage = extractMeta(html, "og:image");

    // Resolve relative og:image URLs
    if (ogImage && !ogImage.startsWith("http")) {
      ogImage = new URL(ogImage, url).href;
    }

    const data: OgData = {
      title: ogTitle,
      description: ogDescription,
      image: ogImage,
      favicon: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`,
      url,
    };

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      title: null,
      description: null,
      image: null,
      favicon: null,
      url: "",
    } satisfies OgData);
  }
}
