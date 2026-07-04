import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
      },
    });
    if (error) {
      toast.error("Google sign-in failed.");
    }
    // On success the browser is redirected to Google by Supabase.
  };

  const handleApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth${dest ? `?redirect=${encodeURIComponent(dest)}` : ""}`,
      },
    });
    if (error) {
      toast.error("Apple sign-in failed.");
    }
    // On success the browser is redirected to Apple by Supabase.
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
          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>
          <Button variant="outline" className="w-full" onClick={handleApple}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z"/>
            </svg>
            Continue with Apple
          </Button>

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
