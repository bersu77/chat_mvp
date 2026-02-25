"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.error ?? "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page px-4">
      <div className="w-full max-w-[420px] animate-fade-in">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Logo" className="w-11 h-11" />
            <span className="text-xl font-semibold text-text-heading tracking-tight">Chatify</span>
          </div>
        </div>

        <div className="bg-bg-surface rounded-3xl p-8 shadow-sm border border-border-primary/50 text-center">
          {status === "loading" && (
            <>
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-brand-500 animate-spin" strokeWidth={1.8} />
                </div>
              </div>
              <h1 className="text-xl font-semibold text-text-heading mb-2">
                Verifying your email...
              </h1>
              <p className="text-sm text-text-placeholder">
                Please wait while we confirm your email address.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" strokeWidth={1.8} />
                </div>
              </div>
              <h1 className="text-xl font-semibold text-text-heading mb-2">
                Email verified!
              </h1>
              <p className="text-sm text-text-placeholder mb-6">
                {message}
              </p>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md"
              >
                Sign in to your account
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-500" strokeWidth={1.8} />
                </div>
              </div>
              <h1 className="text-xl font-semibold text-text-heading mb-2">
                Verification failed
              </h1>
              <p className="text-sm text-text-placeholder mb-6">
                {message}
              </p>
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md"
              >
                Back to register
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg-page">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
