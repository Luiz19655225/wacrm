"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Plug,
  QrCode,
  XCircle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsPanelHead } from "./settings-panel-head";
import type { AccountConnection, Plan } from "@/types";

/**
 * Plan & billing — phase 2.
 *
 * "Use this plan" now drives a real Asaas customer + subscription
 * when ASAAS_API_KEY is configured (src/app/api/billing/subscription/route.ts).
 * Status (trialing/active/past_due/canceled) is always set by the
 * Asaas webhook, never by this panel — this panel only ever sends
 * `plan_code` (+ billing contact, the first time it's needed).
 */

interface BillingSubscriptionSnapshot {
  plan_code: string | null;
  trial_ends_at: string | null;
  trial_status: string;
  subscription_status: string;
  access_status: string;
  next_due_date: string | null;
  asaas_connected: boolean;
  billing_name?: string | null;
  billing_document?: string | null;
  billing_phone?: string | null;
}

const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Payment overdue",
  canceled: "Canceled",
};

const ACCESS_STATUS_LABEL: Record<string, string> = {
  trial: "Trial",
  active: "Active",
  past_due: "Payment overdue",
  blocked: "Blocked",
  canceled: "Canceled",
  read_only: "Read-only",
};

const WARNING_ACCESS_STATUSES = new Set(["past_due", "blocked", "canceled", "read_only"]);

export function BillingPanel() {
  const { accountId, canEditSettings, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<BillingSubscriptionSnapshot | null>(null);
  const [asaasConfigured, setAsaasConfigured] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [connections, setConnections] = useState<AccountConnection[]>([]);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [addingConnection, setAddingConnection] = useState<string | null>(null);

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [pendingPlanCode, setPendingPlanCode] = useState<string | null>(null);
  const [billingName, setBillingName] = useState("");
  const [billingDocument, setBillingDocument] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [submittingContact, setSubmittingContact] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, plansRes, connRes] = await Promise.all([
        fetch("/api/billing/subscription"),
        fetch("/api/billing/plans"),
        fetch("/api/channels/connections"),
      ]);
      if (subRes.ok) {
        const body = await subRes.json();
        setSubscription(body.subscription ?? null);
        setAsaasConfigured(Boolean(body.asaas_configured));
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

  async function submitPlanChange(
    planCode: string,
    contact?: { billing_name: string; billing_document: string; billing_phone: string },
  ): Promise<"ok" | "missing_billing_info" | "error"> {
    const res = await fetch("/api/billing/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_code: planCode, ...contact }),
    });
    if (res.ok) {
      toast.success("Plan updated");
      await fetchAll();
      return "ok";
    }
    const body = await res.json().catch(() => ({ error: null }));
    if (body?.error === "MISSING_BILLING_INFO") {
      return "missing_billing_info";
    }
    toast.error(body?.error ?? body?.message ?? "Failed to update plan");
    return "error";
  }

  async function handleSelectPlan(planCode: string) {
    setChangingPlan(planCode);
    try {
      const outcome = await submitPlanChange(planCode);
      if (outcome === "missing_billing_info") {
        setPendingPlanCode(planCode);
        setBillingName(subscription?.billing_name ?? "");
        setBillingDocument(subscription?.billing_document ?? "");
        setBillingPhone(subscription?.billing_phone ?? "");
        setContactDialogOpen(true);
      }
    } finally {
      setChangingPlan(null);
    }
  }

  async function handleSubmitBillingContact() {
    if (!pendingPlanCode) return;
    if (!billingDocument.trim()) {
      toast.error("CPF or CNPJ is required");
      return;
    }
    setSubmittingContact(true);
    try {
      const outcome = await submitPlanChange(pendingPlanCode, {
        billing_name: billingName,
        billing_document: billingDocument,
        billing_phone: billingPhone,
      });
      if (outcome === "ok") {
        setContactDialogOpen(false);
        setPendingPlanCode(null);
      }
    } finally {
      setSubmittingContact(false);
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
      const { reused } = await res.json().catch(() => ({ reused: false }));
      toast.success(reused ? "A pending connection of this type already exists" : "Connection placeholder created");
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

  const hasPendingOfType = (type: "QR_CODE" | "META_API") =>
    connections.some((c) => c.connection_type === type && c.connection_status === "pending");

  return (
    <section className="max-w-2xl animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="Plan & billing"
        description="Your plan, trial status, billing, and channel connections."
      />

      {!asaasConfigured && (
        <Alert className="mb-5 border-primary/30 bg-primary/5">
          <CreditCard className="size-4 text-primary" />
          <AlertTitle>Billing not connected yet</AlertTitle>
          <AlertDescription>
            No live Asaas billing is configured in this environment yet — choosing a
            plan below only records your preference. Channel connections are still
            placeholders too; they don&apos;t open a live WhatsApp session. Nothing
            here affects your current WhatsApp setup in the{" "}
            <span className="font-medium text-foreground">WhatsApp</span> section.
          </AlertDescription>
        </Alert>
      )}

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
                <Badge variant={WARNING_ACCESS_STATUSES.has(subscription?.access_status ?? "") ? "destructive" : "outline"}>
                  {ACCESS_STATUS_LABEL[subscription?.access_status ?? ""] ?? "Unknown"}
                </Badge>
                <Badge variant="outline">
                  Billing: {SUBSCRIPTION_STATUS_LABEL[subscription?.subscription_status ?? ""] ?? "Unknown"}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  {subscription?.asaas_connected ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <XCircle className="size-3" />
                  )}
                  Connected to Asaas: {subscription?.asaas_connected ? "Yes" : "No"}
                </Badge>
              </div>
              {trialDaysLeft !== null && (
                <p className="text-sm text-muted-foreground">
                  {trialDaysLeft > 0
                    ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your trial.`
                    : "Trial period has ended."}
                </p>
              )}
              {subscription?.next_due_date && (
                <p className="text-sm text-muted-foreground">
                  Next charge: {subscription.next_due_date}
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
                    disabled={addingConnection === "QR_CODE" || hasPendingOfType("QR_CODE")}
                    onClick={() => handleAddConnection("QR_CODE")}
                  >
                    {addingConnection === "QR_CODE" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <QrCode className="size-3.5" />
                    )}
                    {hasPendingOfType("QR_CODE") ? "QR Code pending" : "Add QR Code connection"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={addingConnection === "META_API" || hasPendingOfType("META_API")}
                    onClick={() => handleAddConnection("META_API")}
                  >
                    {addingConnection === "META_API" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plug className="size-3.5" />
                    )}
                    {hasPendingOfType("META_API") ? "Meta API pending" : "Add Meta API connection"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog
        open={contactDialogOpen}
        onOpenChange={(next) => {
          setContactDialogOpen(next);
          if (!next) setPendingPlanCode(null);
        }}
      >
        <DialogContent className="bg-popover border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">Billing details</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Asaas requires a CPF or CNPJ to activate a paid plan. This is stored
              encrypted and only visible to account admins.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Billing name</Label>
              <Input
                value={billingName}
                onChange={(e) => setBillingName(e.target.value)}
                placeholder="Name on the invoice"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">CPF or CNPJ</Label>
              <Input
                value={billingDocument}
                onChange={(e) => setBillingDocument(e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Phone (optional)</Label>
              <Input
                value={billingPhone}
                onChange={(e) => setBillingPhone(e.target.value)}
                placeholder="(11) 90000-0000"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setContactDialogOpen(false)}
              disabled={submittingContact}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitBillingContact} disabled={submittingContact}>
              {submittingContact ? <Loader2 className="size-3.5 animate-spin" /> : "Confirm and activate plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
