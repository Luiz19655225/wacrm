"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { buttonVariants } from "@/components/ui/button";
import { describeAccessStatus, type AccessBannerContent } from "@/lib/billing/status";
import type { AccessStatus, TrialStatus } from "@/types";

// ============================================================
// Global, non-blocking billing banner. Phase 2 enforcement is
// visual only (see Fase 2 plan, Bloco 4) — this never hides content
// or disables anything; it just surfaces `access_status` wherever
// the user is in the app. `describeAccessStatus` (src/lib/billing/status.ts)
// is the single source of truth for the copy, written so a future
// enforcement phase can reuse the same classification instead of
// re-deriving it.
// ============================================================

const TONE_STYLES: Record<AccessBannerContent["tone"], string> = {
  info: "border-primary/30 bg-primary/5 text-foreground",
  warning: "border-amber-500/40 bg-amber-500/10 text-foreground",
  danger: "border-destructive/40 bg-destructive/10 text-foreground",
};

const TONE_ICON: Record<AccessBannerContent["tone"], typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  danger: OctagonAlert,
};

interface SubscriptionSnapshot {
  access_status: AccessStatus;
  trial_status: TrialStatus;
  trial_ends_at: string | null;
  next_due_date: string | null;
}

export function AccessStatusBanner() {
  const { accountId } = useAuth();
  const [content, setContent] = useState<AccessBannerContent | null>(null);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/billing/subscription");
        if (!res.ok) return;
        const { subscription } = (await res.json()) as { subscription: SubscriptionSnapshot | null };
        if (cancelled || !subscription) return;
        setContent(
          describeAccessStatus({
            accessStatus: subscription.access_status,
            trialStatus: subscription.trial_status,
            trialEndsAt: subscription.trial_ends_at,
            nextDueDate: subscription.next_due_date,
          }),
        );
      } catch {
        // Silent — a banner failing to load shouldn't be noisy; the
        // billing panel itself surfaces load errors with a toast.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (!content) return null;

  const Icon = TONE_ICON[content.tone];

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm sm:px-6 ${TONE_STYLES[content.tone]}`}
    >
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0" />
        <span className="font-medium">{content.title}.</span>
        <span className="text-muted-foreground">{content.message}</span>
      </div>
      <Link
        href="/settings?tab=billing"
        className={buttonVariants({ size: "sm", variant: "outline", className: "shrink-0" })}
      >
        View plan & billing
      </Link>
    </div>
  );
}
