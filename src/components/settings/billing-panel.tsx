"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, Loader2, XCircle } from "lucide-react";

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
import { ChannelConnectionsPanel } from "./channel-connections-panel";
import type { Plan } from "@/types";

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
  trialing: "Teste",
  active: "Ativo",
  past_due: "Pagamento atrasado",
  canceled: "Cancelado",
};

const ACCESS_STATUS_LABEL: Record<string, string> = {
  trial: "Teste",
  active: "Ativo",
  past_due: "Pagamento atrasado",
  blocked: "Bloqueado",
  canceled: "Cancelado",
  read_only: "Somente leitura",
};

const WARNING_ACCESS_STATUSES = new Set(["past_due", "blocked", "canceled", "read_only"]);

export function BillingPanel() {
  const { accountId, canEditSettings, profileLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<BillingSubscriptionSnapshot | null>(null);
  const [asaasConfigured, setAsaasConfigured] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);

  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [pendingPlanCode, setPendingPlanCode] = useState<string | null>(null);
  const [billingName, setBillingName] = useState("");
  const [billingDocument, setBillingDocument] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [submittingContact, setSubmittingContact] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, plansRes] = await Promise.all([
        fetch("/api/billing/subscription"),
        fetch("/api/billing/plans"),
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
    } catch {
      toast.error("Falha ao carregar informações de cobrança");
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
      toast.success("Plano atualizado");
      await fetchAll();
      return "ok";
    }
    const body = await res.json().catch(() => ({ error: null }));
    if (body?.error === "MISSING_BILLING_INFO") {
      return "missing_billing_info";
    }
    toast.error(body?.error ?? body?.message ?? "Falha ao atualizar o plano");
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
      toast.error("CPF ou CNPJ é obrigatório");
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
        title="Plano e cobrança"
        description="Seu plano, status do teste, cobrança e conexões de canal."
      />

      {!asaasConfigured && (
        <Alert className="mb-5 border-primary/30 bg-primary/5">
          <CreditCard className="size-4 text-primary" />
          <AlertTitle>Cobrança ainda não conectada</AlertTitle>
          <AlertDescription>
            Nenhuma cobrança real via Asaas está configurada neste ambiente ainda —
            escolher um plano abaixo apenas registra sua preferência. As conexões de
            canal também são placeholders por enquanto; elas não abrem uma sessão de
            WhatsApp real. Nada aqui afeta sua configuração atual de WhatsApp na seção{" "}
            <span className="font-medium text-foreground">WhatsApp</span>.
          </AlertDescription>
        </Alert>
      )}

      {loading || profileLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando...
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <CreditCard className="size-4 text-primary" />
                Status atual
              </CardTitle>
              <CardDescription>
                {subscription?.plan_code
                  ? `Plano: ${subscription.plan_code}`
                  : "Nenhum plano selecionado ainda"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={WARNING_ACCESS_STATUSES.has(subscription?.access_status ?? "") ? "destructive" : "outline"}>
                  {ACCESS_STATUS_LABEL[subscription?.access_status ?? ""] ?? "Desconhecido"}
                </Badge>
                <Badge variant="outline">
                  Cobrança: {SUBSCRIPTION_STATUS_LABEL[subscription?.subscription_status ?? ""] ?? "Desconhecido"}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  {subscription?.asaas_connected ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <XCircle className="size-3" />
                  )}
                  Conectado ao Asaas: {subscription?.asaas_connected ? "Sim" : "Não"}
                </Badge>
              </div>
              {trialDaysLeft !== null && (
                <p className="text-sm text-muted-foreground">
                  {trialDaysLeft > 0
                    ? `Faltam ${trialDaysLeft} dia${trialDaysLeft === 1 ? "" : "s"} do seu teste.`
                    : "O período de teste terminou."}
                </p>
              )}
              {subscription?.next_due_date && (
                <p className="text-sm text-muted-foreground">
                  Próxima cobrança: {subscription.next_due_date}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Planos</CardTitle>
              <CardDescription>
                Todos os planos suportam conexões via QR Code e Meta API —
                os planos diferem nos limites, não no tipo de conexão.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum plano configurado ainda.
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
                        {plan.max_connections ?? "Ilimitadas"} conexão(ões) ·{" "}
                        {plan.max_team_members ?? "Ilimitados"} membro(s)
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
                          "Atual"
                        ) : (
                          "Usar este plano"
                        )}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <ChannelConnectionsPanel />
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
            <DialogTitle className="text-popover-foreground">Dados de cobrança</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              A Asaas exige um CPF ou CNPJ para ativar um plano pago. Isso é
              armazenado de forma criptografada e só fica visível para admins da conta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Nome para cobrança</Label>
              <Input
                value={billingName}
                onChange={(e) => setBillingName(e.target.value)}
                placeholder="Nome na fatura"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">CPF ou CNPJ</Label>
              <Input
                value={billingDocument}
                onChange={(e) => setBillingDocument(e.target.value)}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Telefone (opcional)</Label>
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
              Cancelar
            </Button>
            <Button onClick={handleSubmitBillingContact} disabled={submittingContact}>
              {submittingContact ? <Loader2 className="size-3.5 animate-spin" /> : "Confirmar e ativar plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
