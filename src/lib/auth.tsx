import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { PlanId } from "@/lib/plans";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  /** Includes lite + business (Master Studio). Stored as plan_type in Supabase. */
  plan: PlanId;
  credits: number;
  currency: string;
  avatar_url: string | null;
  avatar_signed_url?: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Max time homepage / app may sit on the auth spinner before showing UI. */
const AUTH_LOADING_TIMEOUT_MS = 3000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, display_name, plan, credits, currency, avatar_url")
        .eq("id", uid)
        .maybeSingle();
      if (data) {
        const p = data as Profile;
        if (p.avatar_url) {
          const { data: signed } = await supabase.storage
            .from("avatars")
            .createSignedUrl(p.avatar_url, 60 * 60);
          p.avatar_signed_url = signed?.signedUrl ?? null;
        } else {
          p.avatar_signed_url = null;
        }
        setProfile(p);
      }
    } catch {
      // Profile load must never block the app shell.
    }
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  useEffect(() => {
    let cancelled = false;
    const clearLoading = () => {
      if (!cancelled) setLoading(false);
    };

    // Safety: never leave the whole app on a white spinner if auth hangs (mobile networks, blocked storage, etc.).
    const timeoutId = window.setTimeout(clearLoading, AUTH_LOADING_TIMEOUT_MS);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
      }
      // Auth state known — drop spinner even if getSession is slow.
      clearLoading();
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) loadProfile(data.session.user.id);
      })
      .catch((err) => {
        console.warn("[auth] getSession failed", err);
      })
      .finally(() => {
        clearLoading();
        window.clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
