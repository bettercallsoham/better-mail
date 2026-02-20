export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="mx-auto max-w-5xl text-center">
        <h1 className="text-5xl font-semibold tracking-tight">
          The AI-First Email Client
        </h1>

        <p className="mt-6 text-lg text-muted-foreground">
          BetterMail helps you reach inbox zero faster with intelligent sorting,
          smart summaries, and a lightning-fast workflow.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <a
            href="/app"
            className="rounded-md bg-primary px-6 py-3 text-primary-foreground hover:opacity-90"
          >
            Open BetterMail
          </a>

          <a
            href="/features"
            className="rounded-md border border-border px-6 py-3 hover:bg-muted"
          >
            Explore Features
          </a>
        </div>
      </section>

      {/* Features Preview */}
      <section className="mt-24 grid gap-12 md:grid-cols-3">
        <div>
          <h3 className="text-xl font-semibold">AI Inbox Sorting</h3>
          <p className="mt-3 text-muted-foreground">
            Automatically categorize and prioritize emails using intelligent AI
            workflows.
          </p>
        </div>

        <div>
          <h3 className="text-xl font-semibold">Smart Summaries</h3>
          <p className="mt-3 text-muted-foreground">
            Instantly summarize long threads and stay focused on what matters.
          </p>
        </div>

        <div>
          <h3 className="text-xl font-semibold">Keyboard-First Workflow</h3>
          <p className="mt-3 text-muted-foreground">
            Designed for speed with powerful shortcuts and zero distractions.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mt-24 text-center">
        <h2 className="text-3xl font-semibold">
          Take control of your inbox today
        </h2>

        <p className="mt-4 text-muted-foreground">
          Join modern teams using BetterMail to reclaim hours every week.
        </p>

        <div className="mt-6">
          <a
            href="/app"
            className="rounded-md bg-primary px-8 py-3 text-primary-foreground hover:opacity-90"
          >
            Get Started
          </a>
        </div>
      </section>
    </>
  );
}
