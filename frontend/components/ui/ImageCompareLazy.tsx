"use client";

import dynamic from "next/dynamic";

// Client-side-only wrapper so tsparticles (~150 KB gz) is split into its own
// chunk and never runs during SSR.
const ImageCompareLazy = dynamic(() => import("@/components/ui/ImageCompare"), {
  ssr: false,
});

export default ImageCompareLazy;
