import posthog from "posthog-js";

export const analytics = {
  ctaClicked: (location: string) =>
    posthog.capture("cta_clicked", { location }),

  pricingViewed: () => posthog.capture("pricing_viewed"),

  userSignedUp: () => posthog.capture("user_signed_up"),

  userLoggedIn: () => posthog.capture("user_logged_in"),

  emailConnected: (provider: string) =>
    posthog.capture("email_connected", { provider }),

  threadOpened: () => posthog.capture("thread_opened"),

  emailArchived: () => posthog.capture("email_archived"),

  emailSent: () => posthog.capture("email_sent"),

  aiSummaryUsed: () => posthog.capture("ai_summary_used"),
};
