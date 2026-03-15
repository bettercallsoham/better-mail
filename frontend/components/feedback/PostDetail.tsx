"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Link } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { TypeBadge } from "./TypeBadge";
import { CommentSection } from "./CommentSection";
import Image from "next/image";
import { useFeedbackPost } from "@/features/feedback/feedback.query";
import { UpvoteButton } from "./UpVoteButton";

export function PostDetail({ postId }: { postId: string }) {
  const router = useRouter();
  const post = useFeedbackPost(postId);

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/app/feedback")}
        className={cn(
          "flex items-center gap-1.5 text-[13px] font-medium",
          "text-neutral-400 dark:text-neutral-500",
          "hover:text-neutral-600 dark:hover:text-neutral-300",
          "transition-colors",
        )}
      >
        <ArrowLeft size={14} />
        Back to feedback
      </button>

      {/* Post card */}
      <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="p-6 space-y-4">
          {/* Type + upvote row */}
          <div className="flex items-start justify-between gap-4">
            <TypeBadge type={post.data.type} />
            <UpvoteButton
              postId={post.data.id}
              initialCount={post.data.upvoteCount}
              initialHasUpvoted={post.data.hasUpvoted}
            />
          </div>

          {/* Title */}
          <h1 className="text-[18px] font-semibold text-neutral-800 dark:text-neutral-100 leading-snug">
            {post.data.title}
          </h1>

          {/* Description */}
          <p className="text-[14px] text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
            {post.data.description}
          </p>

          {/* Attachments */}
          {post.data.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {post.data.attachments.map((url: string, i: number) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-28 h-28 rounded-lg overflow-hidden border border-black/8 dark:border-white/8 hover:opacity-90 transition-opacity shrink-0"
                >
                  <Image
                    src={url}
                    alt={`Attachment ${i + 1}`}
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-2 pt-1 text-[12px] text-neutral-400 dark:text-neutral-500 border-t border-black/[0.04] dark:border-white/[0.04]">
            <span>{post.data.author.fullName}</span>
            <span>·</span>
            <span>
              {formatDistanceToNow(new Date(post.data.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-black/6 dark:border-white/6" />

      {/* Comments */}
      <CommentSection postId={post.data.id} comments={post.data.comments} />
    </div>
  );
}
