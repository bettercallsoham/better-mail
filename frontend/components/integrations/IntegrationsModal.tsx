"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  useIntegrations,
  useGetTelegramLink,
  useDisconnectTelegram,
} from "@/features/integrations/integrations.query";
import { cn } from "@/lib/utils";
import { CheckCircle2, ExternalLink, Loader2, Unlink } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

// ── Telegram card ─────────────────────────────────────────────────────────────

function TelegramCard() {
  const { data, isLoading } = useIntegrations();
  const { mutate: getLink, isPending: isGettingLink } = useGetTelegramLink();
  const { mutate: disconnect, isPending: isDisconnecting } =
    useDisconnectTelegram();

  const [deepLink, setDeepLink] = useState<string | null>(null);

  const tg = data?.telegram;
  const isActive = tg?.status === "active";

  const handleConnect = () => {
    // Open the tab synchronously (direct user gesture) so popup blockers don't interfere,
    // then assign the URL once the API call resolves.
    const newTab = window.open("", "_blank");
    getLink(undefined, {
      onSuccess: (res) => {
        setDeepLink(res.link);
        if (newTab) {
          newTab.location.href = res.link;
        } else {
          // Popup was blocked — the "Open Telegram" fallback button will appear
          window.open(res.link, "_blank");
        }
      },
      onError: () => {
        newTab?.close();
      },
    });
  };

  const displayName = tg?.firstName
    ? [tg.firstName].filter(Boolean).join(" ")
    : tg?.username
      ? `@${tg.username}`
      : null;

  const connectedUser: ConnectedUser | null =
    isActive && displayName
      ? { name: displayName, photoUrl: tg?.photoUrl }
      : null;

  return (
    <IntegrationCard
      icon="/telegramIcon.svg"
      name="Telegram"
      description={
        connectedUser
          ? undefined
          : "Get email summaries, search your inbox, and take actions right from Telegram."
      }
      connectedUser={connectedUser}
      available
    >
      {isLoading ? (
        <Loader2 size={14} className="animate-spin text-neutral-400" />
      ) : isActive ? (
        <button
          onClick={() => disconnect()}
          disabled={isDisconnecting}
          className={cn(
            "flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors",
            "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10",
            isDisconnecting && "opacity-50 pointer-events-none",
          )}
        >
          {isDisconnecting ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Unlink size={12} />
          )}
          Disconnect
        </button>
      ) : (
        <ConnectButton
          loading={isGettingLink}
          onClick={handleConnect}
          deepLink={deepLink}
        />
      )}
    </IntegrationCard>
  );
}

function ConnectButton({
  loading,
  onClick,
  deepLink,
}: {
  loading: boolean;
  onClick: () => void;
  deepLink: string | null;
}) {
  if (deepLink) {
    return (
      <a
        href={deepLink}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-1.5 rounded-lg transition-all",
          "bg-[#2AABEE] hover:bg-[#1E99D6] text-white",
        )}
      >
        <ExternalLink size={12} />
        Open Telegram
      </a>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-1.5 rounded-lg transition-all",
        "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900",
        "hover:bg-neutral-700 dark:hover:bg-neutral-200",
        "active:scale-95",
        loading && "opacity-60 pointer-events-none",
      )}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : null}
      Connect
    </button>
  );
}

// ── Generic card shells ───────────────────────────────────────────────────────

interface ConnectedUser {
  name: string;
  photoUrl?: string | null;
}

function IntegrationCard({
  icon,
  name,
  description,
  available = false,
  connectedUser,
  children,
}: {
  icon: string;
  name: string;
  description?: string;
  available?: boolean;
  connectedUser?: ConnectedUser | null;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-xl border p-4 transition-colors",
        available
          ? "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
          : "bg-neutral-50 dark:bg-neutral-900/40 border-neutral-100 dark:border-neutral-800/50 opacity-60",
      )}
    >
      {/* App icon */}
      <div className="shrink-0 w-10 h-10 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex items-center justify-center shadow-sm">
        <Image src={icon} alt={name} width={22} height={22} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">
            {name}
          </span>
          {!available && <ComingSoonBadge />}
        </div>

        {connectedUser ? (
          /* Connected state — show avatar + name instead of description */
          <div className="mt-1.5 flex items-center gap-2">
            {connectedUser.photoUrl ? (
              <Image
                src={connectedUser.photoUrl}
                alt={connectedUser.name}
                width={20}
                height={20}
                className="rounded-full ring-1 ring-neutral-200 dark:ring-neutral-700"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[9px] font-bold text-neutral-500 dark:text-neutral-300 uppercase">
                {connectedUser.name[0]}
              </div>
            )}
            <span className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300 truncate">
              {connectedUser.name}
            </span>
            <CheckCircle2
              size={12}
              className="shrink-0 text-emerald-500 dark:text-emerald-400"
            />
          </div>
        ) : description ? (
          <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>

      {/* Action slot */}
      {available && children && <div className="shrink-0 ml-2">{children}</div>}
    </div>
  );
}

function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
      Soon
    </span>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function IntegrationsModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 shadow-xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
            Integrations
          </h2>
          <p className="mt-0.5 text-[12px] text-neutral-500 dark:text-neutral-400">
            Connect external apps to supercharge your inbox workflow.
          </p>
        </div>

        {/* Body */}
        <div className="px-4 py-4 flex flex-col gap-2.5">
          {/* Available */}
          <TelegramCard />

          {/* Coming soon */}
          <IntegrationCard
            icon="/slackIcon.svg"
            name="Slack"
            description="Receive email digests and reply to threads from your Slack workspace."
          />
          <IntegrationCard
            icon="/notionIcon.svg"
            name="Notion"
            description="Save emails as Notion pages and sync action items automatically."
          />
          <IntegrationCard
            icon="/calendarIcon.svg"
            name="Google Calendar"
            description="Detect meeting invites and add them to your calendar in one click."
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
