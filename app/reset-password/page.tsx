"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { Lock, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasMinLength = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordStrength = [hasMinLength, hasLetter, hasNumber].filter(Boolean).length;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!hasMinLength) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (!token) {
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
            <h1 className="text-xl font-semibold text-text-heading mb-2">
              Invalid reset link
            </h1>
            <p className="text-sm text-text-placeholder mb-6">
              This password reset link is missing or invalid.
            </p>
            <Link
              href="/forgot-password"
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md"
            >
              Request a new link
            </Link>
          </div>
        </div>
      </div>
    );
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
          {success ? (
            <div className="text-center">
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" strokeWidth={1.8} />
                </div>
              </div>
              <h1 className="text-xl font-semibold text-text-heading mb-2">
                Password updated!
              </h1>
              <p className="text-sm text-text-placeholder mb-6">
                Your password has been reset. Redirecting you to sign in...
              </p>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md"
              >
                Sign in now
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-semibold text-text-heading tracking-tight mb-2">
                  Set new password
                </h1>
                <p className="text-sm text-text-placeholder leading-5">
                  Choose a strong password for your account.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-medium text-text-sub">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-soft" strokeWidth={1.6} />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-12 pl-11 pr-11 rounded-xl border border-stroke-soft bg-bg-surface text-sm text-text-main placeholder:text-text-placeholder outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-soft hover:text-text-sub transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-[18px] h-[18px]" strokeWidth={1.6} />
                      ) : (
                        <Eye className="w-[18px] h-[18px]" strokeWidth={1.6} />
                      )}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="flex flex-col gap-2 pt-1.5">
                      <div className="flex gap-1.5">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              passwordStrength >= level
                                ? passwordStrength === 1
                                  ? "bg-red-400"
                                  : passwordStrength === 2
                                    ? "bg-amber-400"
                                    : "bg-emerald-400"
                                : "bg-bg-senary"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <span className={`text-[10px] leading-3 transition-colors ${hasMinLength ? "text-emerald-500" : "text-text-placeholder"}`}>
                          {hasMinLength ? "\u2713" : "\u2022"} 6+ characters
                        </span>
                        <span className={`text-[10px] leading-3 transition-colors ${hasLetter ? "text-emerald-500" : "text-text-placeholder"}`}>
                          {hasLetter ? "\u2713" : "\u2022"} Has letters
                        </span>
                        <span className={`text-[10px] leading-3 transition-colors ${hasNumber ? "text-emerald-500" : "text-text-placeholder"}`}>
                          {hasNumber ? "\u2713" : "\u2022"} Has numbers
                        </span>
                      </div>
                    </div>
                  )}
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
                    <>
                      Reset password
                      <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg-page">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
