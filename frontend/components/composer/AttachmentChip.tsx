// "use client";

// import { IconX, IconFile, IconPhoto, IconFileText } from "@tabler/icons-react";
// import { cn } from "@/lib/utils";
// import type { ComposerAttachment } from "@/lib/store/composer.store";

// interface AttachmentChipProps {
//   attachment: ComposerAttachment;
//   onRemove:   () => void;
//   className?: string;
// }

// export function AttachmentChip({ attachment, onRemove, className }: AttachmentChipProps) {
//   const Icon = getIcon(attachment.mimeType);
//   const sizeLabel = formatBytes(attachment.size);

//   return (
//     <div className={cn(
//       "inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg max-w-[200px]",
//       "bg-gray-100 dark:bg-white/[0.07]",
//       "border border-black/[0.06] dark:border-white/[0.06]",
//       attachment.uploading && "opacity-60",
//       className,
//     )}>
//       <Icon
//         size={13}
//         className="shrink-0 text-gray-400 dark:text-white/35"
//       />
//       <div className="flex-1 min-
//   );
// }

// // ─── Helpers ───────────────────────────────────────────────────────────────────

// function getIcon(mimeType: string) {
//   if (mimeType.startsWith("image/")) return IconPhoto;
//   if (mimeType.startsWith("text/"))  return IconFileText;
//   return IconFile;
// }

// function formatBytes(bytes: number): string {
//   if (bytes < 1024)          return `${bytes} B`;
//   if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(0)} KB`;
//   return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
// }