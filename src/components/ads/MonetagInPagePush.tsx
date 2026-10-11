'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin-config';
import { shouldShowAds } from '@/lib/policy';
import { useAdsMasterEnabled } from '@/lib/site-settings';
import { isAdRouteAllowed } from '@/config/ads';
import { useRouterState } from '@tanstack/react-router';

const ZONE = '12004581';
const SCRIPT_SRC = 'https://nap5k.com/tag.min.js';
const SCRIPT_ID = 'motio-monetag-ipp';

/**
 * Monetag In-Page Push (zone 12004581).
 * Loads once for confirmed free, signed-in, non-admin users only.
 * Does not request notification permission; renders as in-page unit per Monetag docs.
 * Vignette remains intentionally disabled (overlay interstitial).
 */
export function MonetagInPagePush() {
  const { user, profile, loading } = useAuth();
  const masterOn = useAdsMasterEnabled();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const loadedRef = useRef(false);

  useEffect(() => {
    // Fail closed while auth/plan is resolving
    if (loading) return;
    if (!masterOn) {
      removeOurScript();
      loadedRef.current = false;
      return;
    }
    if (!user) {
      removeOurScript();
      loadedRef.current = false;
      return;
    }

    const admin = isAdminEmail(profile?.email);
    const plan = profile?.plan ?? 'free';
    const eligible = shouldShowAds({ plan, email: profile?.email, isAdmin: admin });

    if (!eligible || !isAdRouteAllowed(pathname)) {
      removeOurScript();
      loadedRef.current = false;
      return;
    }

    if (loadedRef.current) return;
    if (document.getElementById(SCRIPT_ID)) {
      loadedRef.current = true;
      return;
    }

    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.dataset.zone = ZONE;
    s.dataset.motioAllowed = '1';
    s.src = SCRIPT_SRC;
    s.async = true;
    // Prefer body; fall back to documentElement
    const parent = document.body || document.documentElement;
    parent.appendChild(s);
    loadedRef.current = true;

    return () => {
      // Do not remove on every route change if still eligible — only on unmount of gate
      // or when eligibility flips (handled above).
    };
  }, [user, profile?.plan, profile?.email, loading, masterOn, pathname]);

  return null;
}

function removeOurScript() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(SCRIPT_ID);
  if (el) el.remove();
}
