"use client";

import { useComposerStore, type ComposerInstance } from "@/lib/store/composer.store";
import { RecipientInput } from "./RecipientInput";
import { cn } from "@/lib/utils";

interface Props {
  instance: ComposerInstance;
}

export function ComposerHeader({ instance }: Props) {
  const store = useComposerStore();
  const { id } = instance;

  return (
    <div className="shrink-0 divide-y divide-black/[0.04] dark:divide-white/[0.04] border-b border-black/[0.06] dark:border-white/[0.06]">

      {/* To */}
      <div className="flex items-center">
        <RecipientInput
          label="To"
          recipients={instance.to}
          onAdd={r  => store.addTo(id, r)}
          onRemove={e => store.removeTo(id, e)}
          autoFocus={instance.mode === "new" || instance.mode === "forward"}
        />
        <div className="flex gap-1 pr-3 shrink-0">
          {!instance.showCc && (
            <button onClick={() => store.update(id, { showCc: true })}
              className="text-[11px] text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/55 px-1.5 py-0.5 rounded transition-colors">
              Cc
            </button>
          )}
          {!instance.showBcc && (
            <button onClick={() => store.update(id, { showBcc: true })}
              className="text-[11px] text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/55 px-1.5 py-0.5 rounded transition-colors">
              Bcc
            </button>
          )}
        </div>
      </div>

      {/* Cc */}
      {instance.showCc && (
        <RecipientInput
          label="Cc"
          recipients={instance.cc}
          onAdd={r  => store.addCc(id, r)}
          onRemove={e => store.removeCc(id, e)}
        />
      )}

      {/* Bcc */}
      {instance.showBcc && (
        <RecipientInput
          label="Bcc"
          recipients={instance.bcc}
          onAdd={r  => store.addBcc(id, r)}
          onRemove={e => store.removeBcc(id, e)}
        />
      )}

      {/* Subject — only for new/forward, or show read-only label for reply */}
      {(instance.mode === "new" || instance.mode === "forward") ? (
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-[11px] font-medium text-gray-400 dark:text-white/30 shrink-0 w-5">Su</span>
          <input
            value={instance.subject}
            onChange={e => store.update(id, { subject: e.target.value })}
            placeholder="Subject"
            className="flex-1 bg-transparent outline-none text-[13px] text-gray-800 dark:text-white/85 placeholder:text-gray-300 dark:placeholder:text-white/20"
          />
        </div>
      ) : (
        instance.subject && (
          <div className="px-3 py-1.5">
            <p className="text-[11.5px] text-gray-400 dark:text-white/25 truncate">{instance.subject}</p>
          </div>
        )
      )}
    </div>
  );
}