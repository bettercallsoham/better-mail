"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { stripHtml } from "@/lib/utils/stripHtml";

interface UseGhostTextOptions {
  debounceMs?: number;
  minLength?: number;
  enabled?: boolean;
}

interface GhostTextState {
  suggestion: string;
  loading: boolean;
  error: boolean;
}

export function useGhostText(
  html: string,
  threadId: string | undefined,
  options: UseGhostTextOptions = {},
) {
  const { debounceMs = 600, minLength = 20, enabled = true } = options;

  const [state, setState] = useState<GhostTextState>({
    suggestion: "",
    loading: false,
    error: false,
  });

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Strip HTML to plain text for length check + prompt
  const plainText = stripHtml(html);

  const fetchSuggestion = useCallback(async (text: string, tId?: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState((s) => ({ ...s, loading: true, error: false }));

    try {
      const res = await fetch("/api/mail/ghost-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, threadId: tId }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      setState({
        suggestion: data.suggestion ?? "",
        loading: false,
        error: false,
      });
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
      setState({ suggestion: "", loading: false, error: true });
    }
  }, []);

  useEffect(() => {
    if (!enabled || plainText.length < minLength) {
      setState({ suggestion: "", loading: false, error: false });
      return;
    }

    // Debounce
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetchSuggestion(plainText, threadId);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [plainText, threadId, enabled, minLength, debounceMs, fetchSuggestion]);

  // Cleanup on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  const dismiss = useCallback(
    () => setState((s) => ({ ...s, suggestion: "" })),
    [],
  );

  return { ...state, dismiss };
}
