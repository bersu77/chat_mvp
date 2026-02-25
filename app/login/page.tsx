"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Eye, EyeOff, MessageCircle, Shield, Send } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    try {
      event.preventDefault();
      setLoading(true);
      setError(null);
      const formData = new FormData(event.currentTarget);
      const response = await signIn("credentials", {
        ...Object.fromEntries(formData),
        redirect: false,
      });

      if (response?.error) {
        if (response.error.includes("verify your email")) {
          setError("Please verify your email before signing in. Check your inbox for a verification link.");
        } else {
          setError("Invalid email or password. Please try again.");
        }
        setLoading(false);
        return;
      }

      router.push("/chat");
      router.refresh();
    } catch {
      setError("An error occurred during login");
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
            <span className="text-white/90 text-lg font-semibold tracking-tight">Chatify</span>
          </div>

          {/* Hero copy */}
          <div className="max-w-md">
            <h2 className="text-[2.75rem] leading-[1.15] font-bold text-white tracking-tight mb-5">
              Where conversations
              <br />
              <span className="text-white/70">come alive.</span>
            </h2>
            <p className="text-base text-white/60 leading-relaxed mb-10 max-w-sm">
              Real-time messaging with the people who matter most. Fast, private, and beautifully simple.
            </p>

            {/* Feature pills */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover:bg-white/15 transition-colors">
                  <Send className="w-4 h-4 text-white/80" strokeWidth={2} />
                </div>
                <div>
                  <span className="text-sm font-medium text-white/90 block leading-5">Instant delivery</span>
                  <span className="text-xs text-white/45 leading-4">Messages arrive in milliseconds, not seconds</span>
                </div>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover:bg-white/15 transition-colors">
                  <Shield className="w-4 h-4 text-white/80" strokeWidth={2} />
                </div>
                <div>
                  <span className="text-sm font-medium text-white/90 block leading-5">Private by design</span>
                  <span className="text-xs text-white/45 leading-4">Your conversations stay between you</span>
                </div>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 group-hover:bg-white/15 transition-colors">
                  <MessageCircle className="w-4 h-4 text-white/80" strokeWidth={2} />
                </div>
                <div>
                  <span className="text-sm font-medium text-white/90 block leading-5">Rich media sharing</span>
                  <span className="text-xs text-white/45 leading-4">Photos, videos, voice messages &amp; files</span>
                </div>
              </div>
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

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-text-heading tracking-tight mb-2">
              Welcome back
            </h1>
            <p className="text-sm text-text-placeholder leading-5">
              Enter your credentials to access your messages
            </p>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
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
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-medium text-text-sub">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-medium text-brand-500 hover:text-brand-600 transition-colors"
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-soft" strokeWidth={1.6} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
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
                  Sign in
                  <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border-primary" />
            <span className="text-[11px] text-text-placeholder font-medium uppercase tracking-wider">New here?</span>
            <div className="flex-1 h-px bg-border-primary" />
          </div>

          {/* Register CTA */}
          <Link
            href="/register"
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl text-sm font-medium text-text-heading bg-bg-surface border border-stroke-soft hover:border-brand-500/30 hover:bg-bg-surface-weak transition-all duration-200 active:scale-[0.98]"
          >
            Create an account
          </Link>

          {/* Terms */}
          <p className="mt-8 text-center text-[11px] text-text-placeholder leading-4">
            By continuing, you agree to our{" "}
            <span className="text-text-sub hover:text-brand-500 cursor-pointer transition-colors">Terms of Service</span>
            {" "}and{" "}
            <span className="text-text-sub hover:text-brand-500 cursor-pointer transition-colors">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
}
