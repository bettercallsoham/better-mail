import type { Metadata } from "next";
import Link from "next/link";
import React from "react";

export const metadata: Metadata = {
  title: "Terms of Service – BetterMail",
  description:
    "Read BetterMail's Terms of Service to understand the rules and guidelines for using our email productivity application.",
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

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        {/* Header */}
        <div className="mb-12">
          <p className="text-[12px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3">
            Legal
          </p>
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight mb-4">
            Terms of Service
          </h1>
          <p className="text-[14px] text-neutral-500 dark:text-neutral-400">
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        <P>
          Please read these Terms of Service (&ldquo;Terms&rdquo;) carefully
          before using BetterMail (the &ldquo;Service&rdquo;) operated by
          BetterMail (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;)
          at{" "}
          <a
            href={SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
          >
            bettermail.tech
          </a>
          .
        </P>
        <P>
          By accessing or using the Service, you agree to be bound by these
          Terms. If you disagree with any part of these Terms, you may not
          access the Service.
        </P>

        <H2>1. Description of Service</H2>
        <P>
          BetterMail is an email productivity application that connects to your
          existing Google Gmail and Microsoft Outlook accounts via OAuth. The
          Service provides:
        </P>
        <UL>
          <li>
            A unified email client for reading, composing, sending, and
            organising email
          </li>
          <li>
            AI-powered features including email search, thread summarisation,
            smart drafts, and a conversational AI assistant for your inbox
          </li>
          <li>Inbox management tools (labels, filters, archive, snooze)</li>
        </UL>
        <P>
          BetterMail is a third-party client and is not affiliated with,
          endorsed by, or sponsored by Google LLC or Microsoft Corporation.
        </P>

        <H2>2. Eligibility</H2>
        <P>
          You must be at least 13 years old to use BetterMail. By using the
          Service, you represent and warrant that you meet this age requirement.
          If you are using the Service on behalf of an organisation, you
          represent that you have the authority to bind that organisation to
          these Terms.
        </P>

        <H2>3. Accounts and Authentication</H2>
        <P>
          BetterMail does not maintain its own password-based authentication
          system. You sign in using your Google or Microsoft account via OAuth.
          You are responsible for:
        </P>
        <UL>
          <li>
            Maintaining the security of your Google or Microsoft account
            credentials
          </li>
          <li>All activities that occur under your account in BetterMail</li>
          <li>
            Notifying us immediately at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            if you suspect any unauthorised use of your account
          </li>
        </UL>
        <P>
          You may revoke BetterMail&apos;s access to your Google or Microsoft
          account at any time via your provider&apos;s account security
          settings. Revoking access will immediately prevent BetterMail from
          accessing your mailbox.
        </P>

        <H2>4. Acceptable Use</H2>
        <P>
          You agree to use the Service only for lawful purposes. You must not:
        </P>
        <UL>
          <li>
            Use the Service to send spam, phishing emails, or any form of
            unsolicited bulk communication
          </li>
          <li>
            Use the Service to harass, threaten, or harm any individual or group
          </li>
          <li>
            Attempt to gain unauthorised access to our systems, other
            users&apos; accounts, or any third-party systems
          </li>
          <li>
            Reverse engineer, decompile, or disassemble any part of the Service
          </li>
          <li>
            Use automated scripts or bots to access the Service without our
            prior written consent
          </li>
          <li>
            Violate any applicable laws, regulations, or third-party rights
          </li>
          <li>
            Use the Service to transmit malware, viruses, or any code designed
            to damage or interfere with systems
          </li>
        </UL>

        <H2>5. Your Data and Email Content</H2>
        <P>
          You retain full ownership of your email data. BetterMail does not
          claim any ownership rights over your email content. You grant us a
          limited, non-exclusive licence to access and process your email data
          as necessary to provide the Service.{" "}
          <strong>
            BetterMail does not permanently store raw email message bodies or
            attachments.
          </strong>{" "}
          We store only PII-redacted derived representations (such as summaries
          and vector embeddings) that cannot be used to reconstruct the original
          email content.
        </P>
        <P>
          By using the AI features, you acknowledge that relevant portions of
          your email content may be temporarily processed by an AI service
          provider to generate responses. These providers are contractually
          prohibited from retaining your data or training models on it. Please
          refer to our{" "}
          <Link
            href="/privacy-policy"
            className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
          >
            Privacy Policy
          </Link>{" "}
          for full details of how we handle your data.
        </P>

        <H2>6. Third-Party Services</H2>
        <P>The Service integrates with third-party APIs including:</P>
        <UL>
          <li>
            <strong>Google Gmail API</strong> — subject to{" "}
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
            >
              Google&apos;s Terms of Service
            </a>
          </li>
          <li>
            <strong>Microsoft Graph API</strong> — subject to{" "}
            <a
              href="https://www.microsoft.com/en-us/servicesagreement"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
            >
              Microsoft&apos;s Services Agreement
            </a>
          </li>
        </UL>
        <P>
          Your use of BetterMail is also governed by these third-party terms
          where applicable. BetterMail is not responsible for the content,
          privacy practices, or availability of third-party services.
        </P>

        <H2>7. Intellectual Property</H2>
        <P>
          The BetterMail name, logo, application design, and all original
          content within the Service are owned by BetterMail and protected by
          applicable intellectual property laws. You may not copy, modify,
          distribute, or create derivative works based on any part of the
          Service without our prior written consent.
        </P>

        <H2>8. Privacy</H2>
        <P>
          Your use of the Service is also governed by our{" "}
          <Link
            href="/privacy-policy"
            className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          , which is incorporated into these Terms by reference. By using the
          Service, you consent to our data practices as described in the Privacy
          Policy.
        </P>

        <H2>9. Disclaimers and Limitation of Liability</H2>
        <P>
          The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo; basis without warranties of any kind, either express
          or implied, including but not limited to warranties of
          merchantability, fitness for a particular purpose, or
          non-infringement.
        </P>
        <P>We do not warrant that:</P>
        <UL>
          <li>
            The Service will be uninterrupted, error-free, or fully secure
          </li>
          <li>Any errors in the Service will be corrected</li>
          <li>The Service will meet your specific requirements</li>
        </UL>
        <P>
          To the maximum extent permitted by law, BetterMail shall not be liable
          for any indirect, incidental, special, consequential, or punitive
          damages, including loss of data, profits, or goodwill, arising from
          your use of the Service, even if we have been advised of the
          possibility of such damages.
        </P>
        <P>
          Our total liability to you for any claim arising from these Terms or
          use of the Service shall not exceed the amount you paid us in the 12
          months preceding the claim (or $10 if you have not paid us anything).
        </P>

        <H2>10. Indemnification</H2>
        <P>
          You agree to indemnify and hold harmless BetterMail, its officers,
          directors, employees, and agents from any claims, losses, damages,
          liabilities, costs, or expenses (including reasonable attorneys&apos;
          fees) arising from: (a) your use of the Service; (b) your violation of
          these Terms; or (c) your violation of any third-party rights.
        </P>

        <H2>11. Termination</H2>
        <P>
          We reserve the right to suspend or terminate your access to the
          Service at our sole discretion, with or without notice, for conduct
          that we believe violates these Terms or is harmful to other users, us,
          third parties, or the Service.
        </P>
        <P>
          You may stop using the Service at any time. To delete your account and
          request data deletion, contact us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-blue-600 dark:text-blue-400 underline underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </P>
        <P>
          On termination, your right to use the Service will immediately cease.
          Sections 7, 9, 10, and 13 of these Terms will survive termination.
        </P>

        <H2>12. Changes to These Terms</H2>
        <P>
          We reserve the right to modify these Terms at any time. We will post
          the updated Terms on this page with a new &quot;Last updated&quot;
          date. Continued use of the Service after changes become effective
          constitutes your acceptance of the new Terms.
        </P>
        <P>
          For material changes, we will provide at least 14 days&apos; notice
          via email (if we have your address) or via a notice within the
          Service.
        </P>

        <H2>13. Governing Law</H2>
        <P>
          These Terms shall be governed by and construed in accordance with
          applicable laws, without regard to conflict of law principles. Any
          disputes arising from these Terms or your use of the Service shall be
          resolved through good-faith negotiation or, if necessary, through
          binding arbitration.
        </P>

        <H2>14. Contact</H2>
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

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-4 text-[13px] text-neutral-400 dark:text-neutral-500">
          <Link
            href="/"
            className="hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            ← Back to home
          </Link>
          <Link
            href="/privacy-policy"
            className="hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
          >
            Privacy Policy
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
