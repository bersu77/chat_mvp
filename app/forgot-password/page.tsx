"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Send } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page px-4">
      <div className="w-full max-w-[420px] animate-fade-in">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Logo" className="w-11 h-11" />
            <span className="text-xl font-semibold text-text-heading tracking-tight">Chatify</span>
          </div>
        </div>

        <div className="bg-bg-surface rounded-3xl p-8 shadow-sm border border-border-primary/50">
          {sent ? (
            <div className="text-center">
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center">
                  <Send className="w-7 h-7 text-brand-500" strokeWidth={1.8} />
                </div>
              </div>
              <h1 className="text-xl font-semibold text-text-heading mb-2">
                Check your email
              </h1>
              <p className="text-sm text-text-placeholder leading-5 mb-6">
                If an account exists for <span className="font-medium text-text-sub">{email}</span>, we&apos;ve sent a password reset link.
              </p>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-sm font-medium text-text-heading bg-bg-surface border border-stroke-soft hover:bg-bg-surface-weak transition-all duration-200 active:scale-[0.98]"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-semibold text-text-heading tracking-tight mb-2">
                  Forgot password?
                </h1>
                <p className="text-sm text-text-placeholder leading-5">
                  No worries. Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-medium text-text-sub">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-soft" strokeWidth={1.6} />
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-12 pl-11 pr-4 rounded-xl border border-stroke-soft bg-bg-surface text-sm text-text-main placeholder:text-text-placeholder outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all duration-200"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-100">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <span className="text-red-500 text-xs font-bold">!</span>
                    </div>
                    <p className="text-xs text-red-600 leading-4">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-text-placeholder hover:text-text-sub transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
