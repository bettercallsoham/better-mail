"use client";

/**
 * Renders AI message content from the backend system prompt format.
 *
 * Backend uses:
 *   <b>Subject</b> | <i>Snippet</i>
 *   <code>───────────────</code>   (separator)
 *   \n\n between items
 */

import { Fragment } from "react";
import { cn } from "@/lib/utils";

// ─── Parser ──────────────────────────────────────────────────────────────────

type Node =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string }
  | { type: "separator" }
  | { type: "br" };

const SEPARATOR_RE = /^[─\-─═—=*\s]+$/;

function parseInline(raw: string): Node[] {
  const nodes: Node[] = [];
  // Match <b>, <i>, <code> tags
  const re = /<(b|i|code)>([\s\S]*?)<\/\1>/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) {
      nodes.push({ type: "text", value: raw.slice(last, m.index) });
    }
    const tag = m[1] as "b" | "i" | "code";
    const inner = m[2];

    if (tag === "code" && SEPARATOR_RE.test(inner)) {
      nodes.push({ type: "separator" });
    } else if (tag === "b") {
      nodes.push({ type: "bold", value: inner });
    } else if (tag === "i") {
      nodes.push({ type: "italic", value: inner });
    } else {
      nodes.push({ type: "code", value: inner });
    }
    last = m.index + m[0].length;
  }

  if (last < raw.length) {
    nodes.push({ type: "text", value: raw.slice(last) });
  }

  return nodes;
}

function parseParagraphs(content: string): Node[][] {
  // Split on double newlines → paragraphs; single newlines → <br> within a paragraph
  const paras = content.split(/\n\n+/);
  return paras.map((para) => {
    const lines = para.split("\n");
    const nodes: Node[] = [];
    lines.forEach((line, i) => {
      nodes.push(...parseInline(line));
      if (i < lines.length - 1) nodes.push({ type: "br" });
    });
    return nodes;
  });
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

function renderNodes(nodes: Node[], baseKey: string) {
  return nodes.map((node, i) => {
    const key = `${baseKey}-${i}`;
    switch (node.type) {
      case "text":
        return <Fragment key={key}>{node.value}</Fragment>;
      case "bold":
        return (
          <strong key={key} className="font-semibold text-inherit">
            {node.value}
          </strong>
        );
      case "italic":
        return (
          <em key={key} className="italic text-inherit opacity-80">
            {node.value}
          </em>
        );
      case "code":
        return (
          <code
            key={key}
            className="px-1.5 py-0.5 rounded-md text-[11.5px] font-mono bg-black/10 dark:bg-white/8 text-amber-600 dark:text-amber-400 border border-black/8 dark:border-white/8"
          >
            {node.value}
          </code>
        );
      case "separator":
        return (
          <span key={key} className="block my-2.5">
            <span className="block h-px w-full bg-black/8 dark:bg-white/8 rounded-full" />
          </span>
        );
      case "br":
        return <br key={key} />;
      default:
        return null;
    }
  });
}

interface AIRichContentProps {
  content: string;
  className?: string;
  /** Show blinking cursor at end (used in streaming) */
  cursor?: boolean;
}

export function AIRichContent({
  content,
  className,
  cursor,
}: AIRichContentProps) {
  const paragraphs = parseParagraphs(content);

  return (
    <div
      className={cn(
        "text-[13px] leading-[1.65] text-neutral-800 dark:text-[#e2ddd6] font-[450]",
        className,
      )}
    >
      {paragraphs.map((nodes, pi) => (
        <p key={pi} className={pi > 0 ? "mt-2.5" : ""}>
          {renderNodes(nodes, `p${pi}`)}
          {cursor && pi === paragraphs.length - 1 && (
            <span className="inline-block ml-0.5 w-0.5 h-3.5 bg-amber-500 dark:bg-amber-400 align-middle animate-[blink_1s_step-end_infinite]" />
          )}
        </p>
      ))}
    </div>
  );
}
