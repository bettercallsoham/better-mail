import type { Metadata } from "next";
import Link from "next/link";
import React from "react";

export const metadata: Metadata = {
  title: "Privacy Policy – BetterMail",
  description:
    "BetterMail's Privacy Policy explains what data we collect, how we use it, and how we protect your information.",
};

const LAST_UPDATED = "March 10, 2026";
const CONTACT_EMAIL = "admin@bettermail.tech";
const SITE_URL = "https://bettermail.tech";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[20px] font-semibold text-neutral-900 dark:text-neutral-50 tracking-tight mt-12 mb-3">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[16px] font-semibold text-neutral-800 dark:text-neutral-100 tracking-tight mt-6 mb-2">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
      {children}
    </p>
  );
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc list-outside pl-5 space-y-1.5 mb-4 text-[15px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
      {children}
    </ul>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-[13px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-mono">
      {children}
    </code>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        {/* Header */}
        <div className="mb-12">
          <p className="text-[12px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3">
            Legal
          </p>
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-4">
            Privacy Policy
          </h1>
          <p className="text-[14px] text-neutral-500 dark:text-neutral-400">
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <P>
          BetterMail (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;)
          operates the BetterMail email productivity application available at{" "}
          <a
            href={SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
          >
            bettermail.tech
          </a>
          . This Privacy Policy explains how we collect, use, disclose, and
          protect your information when you use our Service.
        </P>
        <P>
          By using BetterMail you agree to the collection and use of information
          in accordance with this policy. If you do not agree, please do not use
          our Service.
        </P>

        {/* Google API Limited Use callout — required for verification */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-5 my-8">
          <p className="text-[13px] font-semibold text-blue-900 dark:text-blue-200 mb-1">
            Google API Services – Limited Use Disclosure
          </p>
          <p className="text-[13px] text-blue-800 dark:text-blue-300 leading-relaxed">
            BetterMail&apos;s use and transfer to any other app of information
            received from Google APIs will adhere to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </div>

        <H2>1. Information We Collect</H2>

        <H3>1.1 Account Information</H3>
        <P>When you sign in via Google OAuth or Microsoft OAuth, we receive:</P>
        <UL>
          <li>Your email address</li>
          <li>Your display name</li>
          <li>
            A profile avatar URL (where provided by the identity provider)
          </li>
          <li>
            OAuth tokens (refresh token) required to access your mailbox on your
            behalf
          </li>
        </UL>
        <P>
          We do not receive or store your account password. Authentication is
          handled entirely by Google or Microsoft.
        </P>

        <H3>1.2 Email Data Processing</H3>
        <P>
          To provide BetterMail&apos;s features, the application temporarily
          processes email message content retrieved via the Google Gmail API or
          Microsoft Graph API.
        </P>
        <P>
          <strong>
            BetterMail does not permanently store raw email message bodies or
            attachments on its servers.
          </strong>
        </P>
        <P>
          Instead, BetterMail generates <strong>derived representations</strong>{" "}
          of email content used to power features such as semantic search and AI
          assistance. These derived representations include:
        </P>
        <UL>
          <li>
            <strong>PII-redacted summaries</strong> — concise descriptions of
            email content with personally identifiable information removed
          </li>
          <li>
            <strong>PII-redacted vector embeddings</strong> — mathematical
            representations of email meaning, generated after PII redaction
          </li>
          <li>
            <strong>Non-sensitive metadata</strong> — such as message
            timestamps, labels, sender/recipient domains, and thread structure
          </li>
        </UL>
        <P>
          These derived representations <strong>cannot be used to reconstruct
          the original email message</strong>. Email content may be processed
          transiently in memory during feature execution but is not retained in
          its original form.
        </P>
        <P>
          We do not process email content for advertising purposes and we do not
          sell email data to third parties.
        </P>

        <H3>1.3 Usage Data</H3>
        <P>
          We may collect anonymised telemetry about how you interact with the
          app (e.g., features used, session duration) to improve the product.
          This data cannot be used to identify individual users or read email
          content.
        </P>

        <H3>1.4 Log Data</H3>
        <P>
          Our servers automatically record standard log data including IP
          addresses, browser type, pages visited, and timestamps. This data is
          used for security monitoring and debugging only, and is retained for a
          maximum of 90 days.
        </P>

        <H2>2. How We Use Your Information</H2>
        <P>We use the data we collect exclusively to:</P>
        <UL>
          <li>
            <strong>Provide the Service</strong> — displaying your emails,
            sending replies, managing folders, and synchronising your mailbox
          </li>
          <li>
            <strong>Power AI features</strong> — AI-based search, email
            summarisation, smart compose suggestions, and the conversational AI
            assistant, which analyses derived email representations to answer
            your questions about your inbox
          </li>
          <li>
            <strong>Authenticate you</strong> — verifying your identity on each
            session via OAuth
          </li>
          <li>
            <strong>Improve the Service</strong> — using aggregated, anonymised
            usage data to fix bugs and build new features
          </li>
          <li>
            <strong>Security and fraud prevention</strong> — detecting anomalous
            activity or unauthorised access
          </li>
        </UL>
        <P>
          <strong>
            We do not use your email content or Google/Microsoft account data
            for advertising, user profiling, or any purpose unrelated to
            providing the BetterMail Service.
          </strong>
        </P>

        <H2>3. How We Share Your Information</H2>
        <P>
          We do not sell, rent, or trade your personal data. We share data only
          in the following limited circumstances:
        </P>

        <H3>3.1 AI Service Providers</H3>
        <P>
          When AI features are used, relevant portions of email content may be
          temporarily processed by an AI service provider to generate summaries
          or responses. These providers act strictly as data processors under
          our instruction and are contractually prohibited from:
        </P>
        <UL>
          <li>Retaining email content after the request is complete</li>
          <li>Training machine learning models on your data</li>
          <li>Sharing your data with third parties</li>
        </UL>

        <H3>3.2 Infrastructure Providers</H3>
        <P>
          We use trusted cloud infrastructure providers for databases, vector
          storage, and caching. All data is encrypted in transit (TLS 1.2+) and
          at rest. These providers are used solely to store and process derived
          representations on our behalf.
        </P>

        <H3>3.3 Legal Requirements</H3>
        <P>
          We may disclose your data if required by law, court order, or
          governmental authority, or if we believe disclosure is necessary to
          protect our rights, property, or the safety of our users.
        </P>

        <H3>3.4 Business Transfers</H3>
        <P>
          In the event of a merger, acquisition, or sale of all or substantially
          all of our assets, user data may be transferred as part of that
          transaction. We will notify you before your data becomes subject to a
          different privacy policy.
        </P>

        <H2>4. Data Retention</H2>
        <UL>
          <li>
            <strong>Raw email message bodies and attachments</strong> — not
            stored on BetterMail servers and therefore not retained
          </li>
          <li>
            <strong>Derived embeddings and summaries</strong> — retained while
            your account is active; deleted within 30 days of account deletion
          </li>
          <li>
            <strong>OAuth tokens</strong> — stored encrypted; revoked and
            deleted immediately upon account disconnection or deletion
          </li>
          <li>
            <strong>Account information</strong> — deleted within 30 days of
            account deletion
          </li>
          <li>
            <strong>Server logs</strong> — retained for a maximum of 90 days
          </li>
          <li>
            <strong>AI conversation history</strong> — retained for 90 days
            after the last message, then permanently deleted
          </li>
        </UL>
        <P>
          You may request deletion of your data at any time by contacting{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          or by disconnecting your account from the Settings page, which
          immediately revokes our access tokens.
        </P>

        <H2>5. Google and Microsoft API Scopes</H2>
        <P>BetterMail requests the following OAuth scopes:</P>

        <H3>Google</H3>
        <UL>
          <li>
            <Code>https://www.googleapis.com/auth/gmail.modify</Code> — read,
            compose, send, and manage messages; manage labels and drafts
          </li>
          <li>
            <Code>openid</Code>, <Code>email</Code>, <Code>profile</Code> —
            identify you and display your name and email address
          </li>
        </UL>

        <H3>Microsoft (Outlook)</H3>
        <UL>
          <li>
            <Code>Mail.ReadWrite</Code> — read and manage your Outlook messages
            and folders
          </li>
          <li>
            <Code>Mail.Send</Code> — send email on your behalf
          </li>
          <li>
            <Code>offline_access</Code> — maintain access when you are not
            actively using the app
          </li>
          <li>
            <Code>openid</Code>, <Code>profile</Code>, <Code>email</Code> —
            identify you
          </li>
        </UL>

        <P>
          We request only the minimum scopes necessary to deliver the Service.
          You can revoke our access at any time via your{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
          >
            Google Account permissions
          </a>{" "}
          or{" "}
          <a
            href="https://account.microsoft.com/privacy/app-access"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
          >
            Microsoft Account app permissions
          </a>
          .
        </P>

        <H2>6. Security</H2>
        <UL>
          <li>TLS 1.2+ encryption for all data in transit</li>
          <li>AES-256 encryption for OAuth tokens and stored embeddings at rest</li>
          <li>
            Role-based access controls limiting who on our team can access
            production systems
          </li>
          <li>Regular security audits and dependency updates</li>
        </UL>
        <P>
          No method of transmission over the internet is 100% secure. While we
          strive to protect your data, we cannot guarantee absolute security.
        </P>

        <H2>7. Your Rights</H2>
        <UL>
          <li>
            <strong>Access</strong> — request a copy of the personal data we
            hold about you
          </li>
          <li>
            <strong>Correction</strong> — request that inaccurate data be
            corrected
          </li>
          <li>
            <strong>Deletion</strong> — request that your data be deleted
          </li>
          <li>
            <strong>Portability</strong> — request your data in a structured,
            machine-readable format
          </li>
          <li>
            <strong>Withdrawal of consent</strong> — disconnect your Google or
            Microsoft account from the Settings page at any time, which
            immediately revokes our access
          </li>
        </UL>
        <P>
          To exercise any of these rights, contact us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>
          . We will respond within 30 days.
        </P>

        <H2>8. Children&apos;s Privacy</H2>
        <P>
          BetterMail is not intended for children under the age of 13. We do not
          knowingly collect personal information from children under 13. If you
          believe we have inadvertently collected such information, please
          contact us immediately.
        </P>

        <H2>9. Changes to This Policy</H2>
        <P>
          We may update this Privacy Policy from time to time. We will notify
          you of material changes by posting the new policy on this page and
          updating the &quot;Last updated&quot; date. For significant changes,
          we will also notify you by email if we have your address on file.
        </P>

        <H2>10. Contact Us</H2>
        <UL>
          <li>
            Email:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
          </li>
          <li>
            Website:{" "}
            <a
              href={SITE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
            >
              {SITE_URL}
            </a>
          </li>
        </UL>

        <H2>11. Google API Data Usage Compliance</H2>
        <P>
          BetterMail&apos;s use of information received from Google APIs adheres
          to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. Specifically, BetterMail
          does not:
        </P>
        <UL>
          <li>Use Gmail data for advertising purposes</li>
          <li>
            Allow humans to read email content unless required for security
            investigation, legal compliance, or at the user&apos;s explicit
            request
          </li>
          <li>
            Transfer Gmail data to third parties except as necessary to provide
            the Service to the user
          </li>
          <li>
            Use Gmail data to develop, train, or improve machine learning models
          </li>
        </UL>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-4 text-[13px] text-neutral-400 dark:text-neutral-500">
          <Link
            href="/"
            className="hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            ← Back to home
          </Link>
          <Link
            href="/terms"
            className="hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            Terms of Service
          </Link>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
    </div>
  );
}