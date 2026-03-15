"use client";

import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/features/user/user.query";
import Image from "next/image";
import { useAddComment, useDeleteComment } from "@/features/feedback/feedback.query";
import { FeedbackComment } from "@/features/feedback/feedback.type";
// ── Avatar ─────────────────────────────────────────────────────────────────────

function CommentAvatar({
  avatar,
  fullName,
}: {
  avatar: string | null;
  fullName: string;
}) {
  const hue = fullName
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={fullName}
        width={28}
        height={28}
        className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-black/10 dark:ring-white/10"
      />
    );
  }

  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold ring-1 ring-black/10 dark:ring-white/10"
      style={{ background: `hsl(${hue} 45% 45%)` }}
    >
      {fullName[0]?.toUpperCase()}
    </div>
  );
}

// ── Single comment ─────────────────────────────────────────────────────────────

function CommentRow({
  comment,
  postId,
  currentUserId,
}: {
  comment: FeedbackComment;
  postId: string;
  currentUserId?: string;
}) {
  const { mutate: deleteComment, isPending } = useDeleteComment();
  const isOwn = currentUserId === comment.author.id;

  return (
    <div className="flex items-start gap-3 group">
      <CommentAvatar
        avatar={comment.author.avatar}
        fullName={comment.author.fullName}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[12.5px] font-semibold text-neutral-700 dark:text-neutral-200">
            {comment.author.fullName}
          </span>
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
            {formatDistanceToNow(new Date(comment.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>

        <p className="text-[13px] text-neutral-600 dark:text-neutral-300 leading-relaxed mt-0.5">
          {comment.body}
        </p>
      </div>

      {/* Delete — only own comments */}
      {isOwn && (
        <button
          onClick={() =>
            deleteComment({ postId, commentId: comment.id })
          }
          disabled={isPending}
          className={cn(
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
            "text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10",
            "transition-all duration-150",
          )}
        >
          {isPending ? (
            <Loader2 size={11} className="animate-spin" />
          ) : (
            <Trash2 size={11} />
          )}
        </button>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function CommentSection({
  postId,
  comments,
}: {
  postId: string;
  comments: FeedbackComment[];
}) {
  const [body, setBody] = useState("");
  const { mutate: addComment, isPending } = useAddComment();
  const { data } = useCurrentUser();
  const currentUserId = data?.user?.id;

  const handleSubmit = useCallback(() => {
    const trimmed = body.trim();
    if (!trimmed || isPending) return;
    addComment(
      { postId, body: trimmed },
      { onSuccess: () => setBody("") },
    );
  }, [body, isPending, postId, addComment]);

  return (
    <div className="space-y-5">
      {/* Comment count */}
      <h3 className="text-[13px] font-semibold text-neutral-700 dark:text-neutral-300">
        {comments.length > 0
          ? `${comments.length} comment${comments.length !== 1 ? "s" : ""}`
          : "No comments yet"}
      </h3>

      {/* Comments list */}
      {comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              postId={postId}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      {/* Add comment */}
      <div className="flex items-start gap-3">
        <div className="flex-1 relative">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
            placeholder="Add a comment…"
            rows={3}
            maxLength={1000}
            className={cn(
              "w-full px-4 py-3 rounded-xl text-[13px] resize-none",
              "bg-neutral-50 dark:bg-white/3",
              "border border-black/6 dark:border-white/6",
              "focus:border-neutral-300 dark:focus:border-white/20",
              "text-neutral-700 dark:text-neutral-300",
              "placeholder:text-neutral-300 dark:placeholder:text-neutral-600",
              "outline-none transition-colors leading-relaxed",
            )}
          />

          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-neutral-300 dark:text-neutral-600">
              ⌘↵ to submit
            </span>

            <button
              onClick={handleSubmit}
              disabled={!body.trim() || isPending}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold",
                "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900",
                "hover:bg-neutral-800 dark:hover:bg-neutral-100",
                "active:scale-[0.97] transition-all duration-150",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
              )}
            >
              {isPending && <Loader2 size={11} className="animate-spin" />}
              Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}