"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Construction,
  CreditCard,
  Loader2,
  Plug,
  QrCode,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { SettingsPanelHead } from "./settings-panel-head";
import type {
  AccountConnection,
  AccountSubscription,
  Plan,
} from "@/types";

/**
 * Plan & billing — phase 1 foundation panel.
 *
 * This is deliberately a structural preview: it shows what plan
 * the account is on, the trial countdown, and connection
 * placeholders, but nothing here creates a real charge. There is no
 * live Asaas subscription behind "Use this plan" yet, and no live
 * Evolution/Meta session behind "Add connection" yet — both just
 * persist a row. The banner below is the load-bearing UX
 * requirement of this phase: never imply active billing that isn't
 * actually happening.
 */
export function BillingPanel() {
  const { accountId, canEditSettings, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<AccountSubscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [connections, setConnections] = useState<AccountConnection[]>([]);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [addingConnection, setAddingConnection] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, plansRes, connRes] = await Promise.all([
        fetch("/api/billing/subscription"),
        fetch("/api/billing/plans"),
        fetch("/api/channels/connections"),
      ]);
      if (subRes.ok) {
        const { subscription } = await subRes.json();
        setSubscription(subscription ?? null);
      }
      if (plansRes.ok) {
        const { plans } = await plansRes.json();
        setPlans(plans ?? []);
      }
      if (connRes.ok) {
        const { connections } = await connRes.json();
        setConnections(connections ?? []);
      }
    } catch {
      toast.error("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (accountId) fetchAll();
  }, [accountId, fetchAll]);

  async function handleSelectPlan(planCode: string) {
    setChangingPlan(planCode);
    try {
      const res = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_code: planCode }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        toast.error(error ?? "Failed to update plan");
        return;
      }
      toast.success("Plan updated");
      await fetchAll();
    } finally {
      setChangingPlan(null);
    }
  }

  async function handleAddConnection(connectionType: "QR_CODE" | "META_API") {
    setAddingConnection(connectionType);
    try {
      const res = await fetch("/api/channels/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_type: connectionType }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        toast.error(error ?? "Failed to create connection");
        return;
      }
      toast.success("Connection placeholder created");
      await fetchAll();
    } finally {
      setAddingConnection(null);
    }
  }

  const trialDaysLeft =
    subscription?.trial_ends_at
      ? Math.max(
          0,
          Math.ceil(
            (new Date(subscription.trial_ends_at).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;

  return (
    <section className="max-w-2xl animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Plan & billing"
        description="Your plan, trial status, and channel connections."
      />

      <Alert className="mb-5 border-primary/30 bg-primary/5">
        <Construction className="size-4 text-primary" />
        <AlertTitle>Foundation preview</AlertTitle>
        <AlertDescription>
          This section shows the structure for plans, trial, and channel
          connections that's being built out. No real subscription or
          charge exists yet, and connections below are placeholders — they
          don't open a live WhatsApp session. Nothing here affects your
          current WhatsApp setup in the{" "}
          <span className="font-medium text-foreground">WhatsApp</span>{" "}
          section.
        </AlertDescription>
      </Alert>

      {loading || profileLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading...
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <CreditCard className="size-4 text-primary" />
                Current status
              </CardTitle>
              <CardDescription>
                {subscription?.plan_code
                  ? `Plan: ${subscription.plan_code}`
                  : "No plan selected yet"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  access: {subscription?.access_status ?? "unknown"}
                </Badge>
                <Badge variant="outline">
                  trial: {subscription?.trial_status ?? "unknown"}
                </Badge>
                <Badge variant="outline">
                  subscription: {subscription?.subscription_status ?? "unknown"}
                </Badge>
              </div>
              {trialDaysLeft !== null && (
                <p className="text-sm text-muted-foreground">
                  {trialDaysLeft > 0
                    ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your trial.`
                    : "Trial period has ended."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Plans</CardTitle>
              <CardDescription>
                All plans support both QR Code and Meta API connections —
                plans differ in limits, not in connection type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No plans configured yet.
                </p>
              ) : (
                plans.map((plan) => (
                  <div
                    key={plan.code}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {plan.public_name ?? plan.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {plan.max_connections ?? "Unlimited"} connection(s) ·{" "}
                        {plan.max_team_members ?? "Unlimited"} member(s)
                      </p>
                    </div>
                    {canEditSettings && (
                      <Button
                        size="sm"
                        variant={
                          subscription?.plan_code === plan.code
                            ? "secondary"
                            : "outline"
                        }
                        disabled={
                          changingPlan === plan.code ||
                          subscription?.plan_code === plan.code
                        }
                        onClick={() => handleSelectPlan(plan.code)}
                      >
                        {changingPlan === plan.code ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : subscription?.plan_code === plan.code ? (
                          "Current"
                        ) : (
                          "Use this plan"
                        )}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Plug className="size-4 text-primary" />
                Channel connections
              </CardTitle>
              <CardDescription>
                Placeholder connections — not wired to a live session yet.
                Your working WhatsApp connection lives in the WhatsApp
                section and is unaffected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {conn.label ?? conn.connection_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conn.provider} · {conn.connection_status}
                    </p>
                  </div>
                  <Badge variant="outline">{conn.connection_status}</Badge>
                </div>
              ))}

              {canEditSettings && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={addingConnection === "QR_CODE"}
                    onClick={() => handleAddConnection("QR_CODE")}
                  >
                    {addingConnection === "QR_CODE" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <QrCode className="size-3.5" />
                    )}
                    Add QR Code connection
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={addingConnection === "META_API"}
                    onClick={() => handleAddConnection("META_API")}
                  >
                    {addingConnection === "META_API" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plug className="size-3.5" />
                    )}
                    Add Meta API connection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
