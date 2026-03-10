"use client";

import { useRef, useState, useCallback, useEffect, memo, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface EmailIframeProps {
  html: string;
  className?: string;
}

export const EmailIframe = memo(function EmailIframe({
  html,
  className,
}: EmailIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(0);
  const [ready, setReady] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // ✅ Memoized — iframe only reloads when html or theme actually changes
  const srcDoc = useMemo(() => buildSrcDoc(html, isDark), [html, isDark]);

  const measure = useCallback((iframe: HTMLIFrameElement) => {
    try {
      const body = iframe.contentDocument?.body;
      if (!body) return;
      iframe.style.height = "1px";
      const h = body.scrollHeight;
      if (h > 0) {
        iframe.style.height = `${h}px`;
        setHeight(h);
        setReady(true);
      }
    } catch {}
  }, []); // ✅ stable reference, no deps

  const patchLinks = useCallback((iframe: HTMLIFrameElement) => {
    try {
      iframe.contentDocument
        ?.querySelectorAll<HTMLAnchorElement>("a[href]")
        .forEach((a) => {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        });
    } catch {}
  }, []);

  const onLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    patchLinks(iframe);
    measure(iframe);
    iframe.contentDocument?.querySelectorAll("img").forEach((img) => {
      img.addEventListener("load", () => measure(iframe));
    });
  }, [measure, patchLinks]);

  // ✅ Reset only when html changes (new email), NOT on theme change
  useEffect(() => {
    setReady(false);
    setHeight(0);
  }, [html]);

  return (
    <div
      className={className}
      style={{ position: "relative", overflowX: "hidden" }}
    >
      {!ready && (
        <div className="space-y-2.5 px-5 py-5">
          {[100, 85, 93, 70, 88, 60, 75, 50].map((w, i) => (
            <Skeleton
              key={i}
              className="h-[13px] rounded-sm"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      )}

      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-same-origin"
        referrerPolicy="no-referrer"
        title="Email content"
        onLoad={onLoad}
        style={{
          width: "100%",
          height: ready ? height : 0,
          border: "none",
          display: "block",
          opacity: ready ? 1 : 0,
          transition: ready ? "opacity 120ms ease" : "none",
        }}
      />
    </div>
  );
});

function buildSrcDoc(html: string, isDark: boolean): string {
  const bg = isDark ? "#1a1a1a" : "#ffffff";
  const color = isDark ? "rgba(255,255,255,0.88)" : "#1f2937";
  const linkColor = isDark ? "#60a5fa" : "#2563eb";
  const bqBorder = isDark ? "rgba(255,255,255,0.10)" : "#e5e7eb";
  const bqColor = isDark ? "rgba(255,255,255,0.42)" : "#6b7280";
  const colorScheme = isDark ? "dark" : "light";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="${colorScheme}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *, *::before, *::after { box-sizing: border-box; }

  html {
    overflow-x: hidden;
    color-scheme: ${colorScheme};
  }

  body {
    margin: 0;
    padding: 16px 20px 24px;

    max-width: 720px;
    margin-left: auto;
    margin-right: auto;

    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;

    color: ${color};
    background: ${bg};

    word-break: break-word;
    -webkit-font-smoothing: antialiased;
  }

  table {
    border-collapse: collapse;
    max-width: 100%;
  }

  td, th {
    word-break: break-word;
  }

  img {
    max-width: 100%;
    height: auto;
  }

  div, table {
    max-width: 100%;
  }

  a {
    color: ${linkColor};
    text-underline-offset: 2px;
  }

  pre, code {
    white-space: pre-wrap;
    word-break: break-all;
    font-size: 12.5px;
  }

  blockquote {
    border-left: 3px solid ${bqBorder};
    margin: 8px 0;
    padding: 2px 12px;
    color: ${bqColor};
  }
</style>
</head>
<body>
  ${html}
</body>
</html>`;
}