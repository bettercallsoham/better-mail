import { cn } from "@/lib/utils";
import Image from "next/image";

interface Props {
  email: string;
  avatar?: string;
  size?: "sm" | "md";
  isActive?: boolean;
}

export function AccountAvatar({ email, avatar, size = "md", isActive }: Props) {
  const initials = email.charAt(0).toUpperCase();
  const dim = size === "sm" ? "h-7 w-7 text-[11px]" : "h-8 w-8 text-xs";

  return (
    <div className="relative flex-shrink-0">
      {avatar ? (
        <Image
          src={avatar}
          alt={email}
          className={cn(
            "rounded-lg object-cover ring-1 ring-black/10 dark:ring-white/10",
            dim,
          )}
        />
      ) : (
        <div
          className={cn(
            "rounded-lg flex items-center justify-center font-semibold bg-neutral-700 text-white",
            dim,
          )}
        >
          {initials}
        </div>
      )}
      {isActive && (
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-blue-500 ring-2 ring-[#f4f4f4] dark:ring-[#0C0C0C] flex items-center justify-center">
          <svg
            viewBox="0 0 8 8"
            className="h-1.5 w-1.5 text-white"
            fill="currentColor"
          >
            <path
              d="M1.5 4L3 5.5L6.5 2"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </div>
  );
}
