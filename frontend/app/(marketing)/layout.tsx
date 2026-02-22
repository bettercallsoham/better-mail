import { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing-page/Navbar";

export const metadata: Metadata = {
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
  },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  // const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bettermail.tech";

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What makes BetterMail different from Gmail?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "BetterMail uses AI to automatically sort, summarize, and prioritize your inbox so you can reach inbox zero faster.",
        },
      },
      {
        "@type": "Question",
        name: "Is BetterMail an alternative to Superhuman?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. BetterMail offers AI-powered automation and a keyboard-first workflow designed for power users.",
        },
      },
      {
        "@type": "Question",
        name: "Does BetterMail support AI email summaries?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. BetterMail can generate smart summaries for long email threads instantly.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqLd),
        }}
      />

      <main className="">
        <Navbar />
        {children}
      </main>
    </>
  );
}
