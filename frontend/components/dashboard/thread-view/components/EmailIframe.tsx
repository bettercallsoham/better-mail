"use client";

import { useRef, useState, useCallback, useEffect, memo } from "react";
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

  const srcDoc = buildSrcDoc(html);

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
  }, []);

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

    // re-measure after images load
    iframe.contentDocument?.querySelectorAll("img").forEach((img) => {
      img.addEventListener("load", () => measure(iframe));
    });
  }, [measure, patchLinks]);

  useEffect(() => {
    return () => {};
  }, []);

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

function buildSrcDoc(html: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *, *::before, *::after { box-sizing: border-box; }

  html {
    overflow-x: hidden;
  }

  body {
    margin: 0;
    padding: 16px 20px 24px;

    /* THE IMPORTANT FIX */
    max-width: 720px;
    margin-left: auto;
    margin-right: auto;

    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1f2937;
    background: #ffffff;

    word-break: break-word;
    -webkit-font-smoothing: antialiased;
  }

  /* Let email tables behave normally */
  table {
    border-collapse: collapse;
    max-width: 100%;
  }

  td, th {
    word-break: break-word;
  }

  /* Only constrain images — do not force full width */
  img {
    max-width: 100%;
    height: auto;
  }

  /* Prevent giant horizontal overflow */
  div, table {
    max-width: 100%;
  }

  a {
    color: #2563eb;
    text-underline-offset: 2px;
  }

  pre, code {
    white-space: pre-wrap;
    word-break: break-all;
    font-size: 12.5px;
  }

  blockquote {
    border-left: 3px solid #e5e7eb;
    margin: 8px 0;
    padding: 2px 12px;
    color: #6b7280;
  }
</style>
</head>
<body>
  ${html}
</body>
</html>`;
}