import { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bettermail.tech";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "BetterMail",
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
      },
      {
        "@type": "SoftwareApplication",
        name: "BetterMail",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description:
          "BetterMail is an AI-powered email client built for speed, focus, and modern teams.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    ],
  };

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      {/* TODO : UPDATE NAVBAR COMPONENT LATER  */}
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold">
            BetterMail
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="/features" className="hover:text-foreground">
              Features
            </a>
            <a href="/pricing" className="hover:text-foreground">
              Pricing
            </a>
            <a
              href="/app"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
            >
              Open App
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-16">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-muted/40">
        <div className="mx-auto max-w-7xl px-6 py-12 text-sm text-muted-foreground">
          <div className="flex flex-col gap-6 md:flex-row md:justify-between">
            <p>© {new Date().getFullYear()} BetterMail. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="/privacy" className="hover:text-foreground">
                Privacy
              </a>
              <a href="/terms" className="hover:text-foreground">
                Terms
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
