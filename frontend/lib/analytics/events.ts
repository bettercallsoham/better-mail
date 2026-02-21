import posthog from "posthog-js";

export const analytics = {
  ctaClicked: (location: string) =>
    posthog.capture("cta_clicked", { location }),

  pricingViewed: () => posthog.capture("pricing_viewed"),

  outlookLogin: () => posthog.capture("user_outlook_login"),

  gmailLogin: () => posthog.capture("user_gmail_login"),

  emailConnected: (provider: string) =>
    posthog.capture("email_connected", { provider }),

  threadOpened: () => posthog.capture("thread_opened"),

  emailArchived: () => posthog.capture("email_archived"),

  emailSent: () => posthog.capture("email_sent"),

  aiSummaryUsed: () => posthog.capture("ai_summary_used"),
};
