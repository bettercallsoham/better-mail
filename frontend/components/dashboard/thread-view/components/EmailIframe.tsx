"use client";

import { useRef, useState, useCallback, memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface EmailIframeProps {
  html: string;
  /** Cap images to this px height — default 360 */
  maxImageHeight?: number;
}

export const EmailIframe = memo(function EmailIframe({
  html,
  maxImageHeight = 360,
}: EmailIframeProps) {
  const ref           = useRef<HTMLIFrameElement>(null);
  const [h, setH]     = useState(0);
  const [ready, setR] = useState(false);

  const srcDoc = `<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="color-scheme" content="light">
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html { overflow: hidden; }
  body {
    margin: 0; padding: 20px 22px 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
    font-size: 14px; line-height: 1.7; color: #1f2937;
    background: transparent; overflow-x: hidden; word-break: break-word;
  }
  img {
    max-width: 100% !important;
    max-height: ${maxImageHeight}px;
    height: auto;
    object-fit: contain;
    display: block;
    border-radius: 6px;
  }
  a    { color: #2563eb; text-underline-offset: 2px; }
  table, td, th { max-width: 100% !important; word-break: break-word; }
  [width]        { width: auto !important; max-width: 100% !important; }
  pre, code      { white-space: pre-wrap; word-break: break-all; font-size: 13px; }
  blockquote     { border-left: 2px solid #e5e7eb; margin: 8px 0; padding: 2px 12px; color: #9ca3af; }
  /* Strip hard-coded heights from email templates */
  [height]       { height: auto !important; }
</style>
</head><body>${html}</body></html>`;

  const fit = useCallback((iframe: HTMLIFrameElement) => {
    try {
      const body = iframe.contentDocument?.body;
      if (!body) return;
      iframe.style.height = "0px";
      const s = body.scrollHeight;
      if (s > 0) { iframe.style.height = `${s}px`; setH(s); setR(true); }
    } catch { /* cross-origin guard */ }
  }, []);

  return (
    <div className="relative">
      {!ready && (
        <div className="space-y-2 px-5 py-4">
          {[100, 83, 92, 76, 88, 65, 50].map((w, i) => (
            <Skeleton key={i} className="h-[13px] rounded-sm" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}
      <iframe
        ref={ref}
        srcDoc={srcDoc}
        sandbox="allow-same-origin"
        title="Email"
        className={ready ? "w-full border-0 block opacity-100" : "w-full border-0 block opacity-0 absolute inset-0"}
        style={{ height: ready ? h : 0 }}
        onLoad={(e) => {
          const f = e.currentTarget;
          fit(f);
          // Retry for lazy-loaded images inside the email
          setTimeout(() => fit(f), 300);
          setTimeout(() => fit(f), 900);
          setTimeout(() => fit(f), 2500);
        }}
      />
    </div>
  );
});