"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useWindowInstances } from "@/lib/store/composer.store";
import { WindowShell } from "./shells/WindowShell";

export function ComposerPortal() {
  const instances = useWindowInstances();

  // Same fix as ThreadSideSheet — wait for client mount before portal
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !instances.length) return null;

  return createPortal(
    instances.map((inst, i) => <WindowShell key={inst.id} instance={inst} index={i} />),
    document.body,
  );
}