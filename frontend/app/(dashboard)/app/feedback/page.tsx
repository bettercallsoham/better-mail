import { CreatePostSheet } from "@/components/feedback/CreatePostSheet";
import {
  FeedbackBoard,
  FeedbackBoardSkeleton,
} from "@/components/feedback/FeedbackBoard";
import { Suspense } from "react";

export default function FeedbackPage() {
  return (
    <div className="h-full overflow-y-auto">
      <Suspense
        fallback={
          <div className="max-w-2xl mx-auto px-4 py-6">
            <FeedbackBoardSkeleton />
          </div>
        }
      >
        <FeedbackBoard />
      </Suspense>
      <CreatePostSheet />
    </div>
  );
}
