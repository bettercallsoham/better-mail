import {
  IconSend,
  IconStar,
  IconArchive,
  IconMail,
  IconMailOpened,
  IconAlertCircle,
  IconClock,
  IconTag,
} from "@tabler/icons-react";

import { MailLabel, SystemFolders } from "@/features/mailbox/mailbox.type";

export interface FolderItem {
  label: string;
  folder: string;
  icon: React.ReactNode;
  count?: number;
}

export const SYSTEM_FOLDER_CONFIG: {
  key: keyof SystemFolders;
  folder: string;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "inbox",
    folder: "inbox",
    label: "Inbox",
    icon: <IconMail size={18} stroke={1.5} />,
  },
  {
    key: "unread",
    folder: "unread",
    label: "Unread",
    icon: <IconMailOpened size={18} stroke={1.5} />,
  },
  {
    key: "starred",
    folder: "starred",
    label: "Starred",
    icon: <IconStar size={18} stroke={1.5} />,
  },
  {
    key: "sent",
    folder: "sent",
    label: "Sent",
    icon: <IconSend size={18} stroke={1.5} />,
  },
  {
    key: "archived",
    folder: "archived",
    label: "Archived",
    icon: <IconArchive size={18} stroke={1.5} />,
  },
  {
    key: "important",
    folder: "important",
    label: "Important",
    icon: <IconAlertCircle size={18} stroke={1.5} />,
  },
  {
    key: "drafts",
    folder: "drafts",
    label: "Drafts",
    icon: <IconClock size={18} stroke={1.5} />,
  },
];

const SYSTEM_LABEL_ALIASES = new Set([
  "inbox",
  "sent",
  "starred",
  "important",
  "draft",
  "drafts",
  "unread",
  "archived",
  "yellow_star",
]);

// ── Builders ───────────────────────────────────────────────────────────────

export function buildSystemFolders(system?: SystemFolders): FolderItem[] {
  if (!system)
    return SYSTEM_FOLDER_CONFIG.map((c) => ({ ...c, count: undefined }));

  return SYSTEM_FOLDER_CONFIG.map((config) => ({
    label: config.label,
    folder: config.folder,
    icon: config.icon,
    count: system[config.key] ?? 0,
  }));
}

/** Pretty-print a label key like "CATEGORY_UPDATES" → "Updates" */
export function formatLabelName(raw: string): string {
  return raw
    .replace(/^CATEGORY_/i, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function buildLabelFolders(labels?: MailLabel[]): FolderItem[] {
  if (!labels) return [];

  return labels
    .filter((l) => !SYSTEM_LABEL_ALIASES.has(l.label.toLowerCase()))
    .map((l) => ({
      label: formatLabelName(l.label),
      folder: `label:${l.label}`,
      icon: <IconTag size={16} stroke={1.5} />,
      count: l.count,
    }));
}
