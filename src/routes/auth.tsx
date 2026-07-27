import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup" | "otp">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);

  const dest = redirect || "/dashboard";

  useEffect(() => {
    if (user) navigate({ to: dest });
  }, [user, navigate, dest]);

  const friendlyError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : "Authentication failed.";
    if (/invalid login credentials/i.test(msg)) return "Incorrect email or password.";
    if (/email not confirmed/i.test(msg)) return "Please verify your email before signing in. Check your inbox.";
    if (/already registered|already exists/i.test(msg)) return "An account with this email already exists. Try signing in.";
    if (/rate limit|too many/i.test(msg)) return "Too many attempts. Please wait a moment and try again.";
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return toast.error("Please enter your email.");
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");

    if (mode === "signup") {
      if (password !== confirmPassword) {
        return toast.error("Passwords do not match.");
      }
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // When email confirmation is required, no session is returned yet.
        if (!data.session) {
          toast.success("Account created! Check your email to verify your account before signing in.");
          setMode("signin");
          setPassword("");
          setConfirmPassword("");
          return;
        }
        toast.success("Account created!");
        navigate({ to: dest });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: dest });
      }
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Enter your email first.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success("We emailed you a 6-digit code.");
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email",
      });
      if (error) throw error;
      navigate({ to: dest });
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth${dest ? `?redirect=${encodeURIComponent(dest)}` : ""}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      toast.error("Google sign-in failed.");
    }
    // On success the browser is redirected to Google by Supabase.
  };

  const handleReset = async () => {
    if (!email) return toast.error("Enter your email first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent. Check your inbox.");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="text-2xl font-bold">
          {mode === "otp" ? "Sign in with a code" : mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "otp"
            ? "We'll email you a one-time code."
            : mode === "signin"
              ? "Sign in to continue."
              : "Start with free credits. You'll verify your email after signing up."}
        </p>

        {mode === "otp" ? (
          otpSent ? (
            <form onSubmit={handleVerifyOtp} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="otp">Enter the 6-digit code</Label>
                <Input id="otp" inputMode="numeric" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} required className="mt-1.5 tracking-widest" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying…" : "Verify & sign in"}
              </Button>
              <button type="button" onClick={() => { setOtpSent(false); setOtpCode(""); }} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
                Use a different email
              </button>
            </form>
          ) : (
            <form onSubmit={handleSendOtp} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="otp-email">Email</Label>
                <Input id="otp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Email me a code"}
              </Button>
            </form>
          )
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {mode === "signup" && (
              <div>
                <Label htmlFor="confirm-password">Confirm password</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                    autoComplete="new-password"
                  />
                </div>
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <p className="mt-1.5 text-xs text-destructive">Passwords do not match.</p>
                )}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
            </Button>
          </form>
        )}

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleGoogle}
            className="btn-animate flex w-full items-center justify-center gap-3 rounded-md border border-[#dadce0] bg-white px-4 py-2.5 text-sm font-medium text-[#3c4043] shadow-sm transition hover:shadow-md dark:border-[#3c4043] dark:bg-white"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => { setMode(mode === "otp" ? "signin" : "otp"); setOtpSent(false); setOtpCode(""); }}
          >
            {mode === "otp" ? "Use email & password" : "Email me a one-time code"}
          </Button>
        </div>

        {mode !== "otp" && (
          <div className="mt-6 flex items-center justify-between text-sm">
            <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setConfirmPassword(""); }} className="text-primary hover:underline">
              {mode === "signin" ? "Create account" : "Have an account? Sign in"}
            </button>
            {mode === "signin" && (
              <button onClick={handleReset} className="text-muted-foreground hover:text-foreground">
                Forgot password?
              </button>
            )}
          </div>
        )}

        <Link to="/" className="mt-8 text-center text-xs text-muted-foreground hover:text-foreground">
          ← Back home
        </Link>
      </div>
    </div>
  );
}
