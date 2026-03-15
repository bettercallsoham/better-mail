import { PostDetail } from "@/components/feedback/PostDetail";
import { Suspense } from "react";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  return (
    <div className="h-full overflow-y-auto">
      <Suspense
        fallback={
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            <div className="h-4 w-24 rounded-full bg-neutral-100 dark:bg-white/4 animate-pulse" />
            <div className="h-48 rounded-2xl bg-neutral-100 dark:bg-white/4 animate-pulse" />
          </div>
        }
      >
        <PostDetail postId={postId} />
      </Suspense>
    </div>
  );
}