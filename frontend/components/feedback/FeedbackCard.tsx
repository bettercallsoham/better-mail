"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { TypeBadge } from "./TypeBadge";
import Image from "next/image";
import { FeedbackPost } from "@/features/feedback/feedback.type";
import { UpvoteButton } from "./UpVoteButton";

export const FeedbackCard = memo(function FeedbackCard({
  post,
}: {
  post: FeedbackPost;
}) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/app/feedback/${post.id}`)}
      className={cn(
        "group flex items-start gap-4 px-4 py-4 rounded-xl cursor-pointer",
        "border border-border",
        "bg-card hover:bg-accent/40",
        "transition-all duration-150",
      )}
    >
      <UpvoteButton
        postId={post.id}
        initialCount={post.upvoteCount}
        initialHasUpvoted={post.hasUpvoted}
      />

      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Type */}
        <TypeBadge type={post.type} />

        {/* Title */}
        <p className="text-[13.5px] font-semibold text-foreground leading-snug">
          {post.title}
        </p>

        {/* Description */}
        <p className="text-[12.5px] text-muted-foreground leading-relaxed line-clamp-2">
          {post.description}
        </p>

        {/* Attachment thumbnails */}
        {post.attachments.length > 0 && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {post.attachments.slice(0, 3).map((url, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-md overflow-hidden border border-border shrink-0"
              >
                <Image
                  src={url}
                  alt=""
                  width={28}
                  height={28}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {post.attachments.length > 3 && (
              <span className="text-[11px] text-muted-foreground">
                +{post.attachments.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 pt-0.5">
          <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
            <MessageSquare size={11} strokeWidth={1.5} />
            {post.commentCount}
          </span>
          <span className="text-[11.5px] text-muted-foreground">
            {post.author.fullName}
          </span>
          <span className="text-[11.5px] text-muted-foreground/60">
            {formatDistanceToNow(new Date(post.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    </div>
  );
});