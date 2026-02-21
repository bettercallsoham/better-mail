"use client";

import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics/events";

export default function LandingPage() {
  return (
    <>
      <section className="mx-auto max-w-5xl text-center">
        <Button onClick={() => analytics.ctaClicked("Get Started")}>
          Get started
        </Button>
      </section>
    </>
  );
}
