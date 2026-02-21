"use client";

import { analytics } from "@/lib/analytics/events";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AuthPage() {
  const handleGoogleLogin = () => {
    analytics.gmailLogin();
    window.location.href = `${API_URL}/api/v1/auth/google`;
  };

  const handleOutlookLogin = () => {
    analytics.outlookLogin();
    window.location.href = `${API_URL}/api/v1/auth/outlook`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-800 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            Welcome to BetterMail
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Connect your inbox. Stay organized. Move faster.
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-8 space-y-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition font-medium"
          >
            <Image src="/google-logo.svg" alt="Google" width={20} height={20} />
            Continue with Google
          </button>

          <button
            onClick={handleOutlookLogin}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition font-medium"
          >
            <Image
              src="/outlook-logo.svg"
              alt="Outlook"
              width={20}
              height={20}
            />
            Continue with Outlook
          </button>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-center text-neutral-500 dark:text-neutral-400">
          By continuing, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
