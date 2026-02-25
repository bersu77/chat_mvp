"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Check, Send, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const hasMinLength = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordStrength = [hasMinLength, hasLetter, hasNumber].filter(Boolean).length;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    try {
      event.preventDefault();
      setLoading(true);
      setError(null);
      const formData = new FormData(event.currentTarget);
      const name = formData.get("name") as string;
      const email = formData.get("email") as string;
      const pw = formData.get("password") as string;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: pw }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setSubmittedEmail(email);
      setEmailSent(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-bg-page">
      {/* Left panel — immersive brand visual */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        {/* Background image with green overlay */}
        <img
          src="https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-br from-[#0d6b5a]/90 via-brand-500/80 to-text-success/70" />

        {/* Decorative floating shapes */}
        <div className="absolute top-20 left-16 w-72 h-72 rounded-full bg-white/4 blur-sm" />
        <div className="absolute bottom-32 right-20 w-96 h-96 rounded-full bg-white/3 blur-sm" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/5" />

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          {/* Logo + brand */}
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Logo" className="w-12 h-12" />
            <span className="text-white/90 text-lg font-semibold tracking-tight">Chatty</span>
          </div>

          {/* Hero copy — registration focused */}
          <div className="max-w-md">
            <h2 className="text-[2.75rem] leading-[1.15] font-bold text-white tracking-tight mb-5">
              Start chatting
              <br />
              <span className="text-white/70">in seconds.</span>
            </h2>
            <p className="text-base text-white/60 leading-relaxed mb-10 max-w-sm">
              Join thousands of people having meaningful conversations every day. Your inbox is waiting.
            </p>

            {/* What you get */}
            <div className="flex flex-col gap-3.5">
              {[
                "Unlimited messages with anyone",
                "Share photos, videos & voice notes",
                "See when friends are online",
                "Read receipts & typing indicators",
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white/90" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm text-white/75 leading-5">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {["/pic.png", "/pic2.png", "/pic3.png", "/pic4.png"].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="w-8 h-8 rounded-full border-2 border-white/20 object-cover"
                />
              ))}
            </div>
            <div>
              <p className="text-xs text-white/70 leading-4">
                <span className="text-white/90 font-medium">2,400+</span> people already chatting
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px] animate-fade-in">
          {/* Mobile logo — only visible on small screens */}
          <div className="flex lg:hidden justify-center mb-8">
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="Logo" className="w-11 h-11" />
              <span className="text-xl font-semibold text-text-heading tracking-tight">Chatify</span>
            </div>
          </div>

          {emailSent ? (
            /* Check your email state */
            <div className="text-center">
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center">
                  <Send className="w-7 h-7 text-brand-500" strokeWidth={1.8} />
                </div>
              </div>
              <h1 className="text-2xl font-semibold text-text-heading tracking-tight mb-2">
                Check your email
              </h1>
              <p className="text-sm text-text-placeholder leading-5 mb-2">
                We&apos;ve sent a verification link to
              </p>
              <p className="text-sm font-medium text-text-heading mb-8">
                {submittedEmail}
              </p>
              <p className="text-xs text-text-placeholder leading-5 mb-6">
                Click the link in the email to verify your account. If you don&apos;t see it, check your spam folder.
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-text-heading tracking-tight mb-2">
              Create your account
            </h1>
            <p className="text-sm text-text-placeholder leading-5">
              Free forever. No credit card required.
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-medium text-text-sub">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-soft" strokeWidth={1.6} />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Your name"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-stroke-soft bg-bg-surface text-sm text-text-main placeholder:text-text-placeholder outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-text-sub">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-soft" strokeWidth={1.6} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-stroke-soft bg-bg-surface text-sm text-text-main placeholder:text-text-placeholder outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-text-sub">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-soft" strokeWidth={1.6} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="Create a password"
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

              {/* Password strength indicator */}
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
                  Create account
                  <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border-primary" />
            <span className="text-[11px] text-text-placeholder font-medium uppercase tracking-wider">Already a member?</span>
            <div className="flex-1 h-px bg-border-primary" />
          </div>

          {/* Login CTA */}
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-sm font-medium text-text-heading bg-bg-surface border border-stroke-soft hover:border-brand-500/30 hover:bg-bg-surface-weak transition-all duration-200 active:scale-[0.98]"
          >
            Sign in instead
          </Link>

          {/* Terms */}
          <p className="mt-8 text-center text-[11px] text-text-placeholder leading-4">
            By creating an account, you agree to our{" "}
            <span className="text-text-sub hover:text-brand-500 cursor-pointer transition-colors">Terms of Service</span>
            {" "}and{" "}
            <span className="text-text-sub hover:text-brand-500 cursor-pointer transition-colors">Privacy Policy</span>
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
