"use client";

import React, { Suspense } from "react";
import { useCurrentUser } from "@/features/user/user.query";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import Image from "next/image";

function UserFooterInner({ isOpen }: { isOpen: boolean }) {
  const { data } = useCurrentUser();
  const user = data?.user;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg transition-colors cursor-pointer",
        "hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60",
        isOpen ? "px-2.5 py-2 mx-2" : "justify-center w-9 h-9 mx-auto",
      )}
    >
      {/* Avatar */}
      {user?.avatar ? (
        <Image
          src={user.avatar}
          alt={user.fullName}
          className="h-6 w-6 rounded-full object-cover flex-shrink-0 ring-1 ring-black/10 dark:ring-white/10"
        />
      ) : (
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0" />
      )}

      {/* Name — only when expanded */}
      <motion.div
        animate={{ opacity: isOpen ? 1 : 0, width: isOpen ? "auto" : 0 }}
        transition={{ duration: 0.15 }}
        className="overflow-hidden whitespace-nowrap min-w-0"
      >
        <p className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-200 truncate leading-tight">
          {user?.fullName ?? "—"}
        </p>
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate leading-tight">
          {user?.email ?? ""}
        </p>
      </motion.div>
    </div>
  );
}

function UserFooterSkeleton({ isOpen }: { isOpen: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5",
        isOpen ? "px-2.5 py-2 mx-2" : "justify-center mx-auto",
      )}
    >
      <div className="h-6 w-6 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse flex-shrink-0" />
      {isOpen && (
        <div className="space-y-1.5">
          <div className="h-2.5 w-20 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div className="h-2 w-28 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        </div>
      )}
    </div>
  );
}

export function UserFooter({ isOpen }: { isOpen: boolean }) {
  return (
    <Suspense fallback={<UserFooterSkeleton isOpen={isOpen} />}>
      <UserFooterInner isOpen={isOpen} />
    </Suspense>
  );
}
