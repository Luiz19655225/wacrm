"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Clock, Loader2, Plug, QrCode, RefreshCcw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { AccountConnection } from "@/types";

const POLL_INTERVAL_MS = 4000;
// WhatsApp QR codes expire ~40 s after generation. After this threshold we
// show "QR expirado" and trigger a silent re-provisioning so the user
// always has a fresh code to scan without having to click anything.
const QR_LIFETIME_S = 40;

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  qrcode_ready: "Aguardando leitura",
  connected: "Conectado",
  disconnected: "Desconectado",
  error: "Erro",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function getQrSecondsLeft(conn: AccountConnection, now: number): number {
  if (!conn.updated_at) return QR_LIFETIME_S;
  const elapsed = Math.floor((now - new Date(conn.updated_at).getTime()) / 1000);
  return Math.max(0, QR_LIFETIME_S - elapsed);
}

interface StatusCheckResult {
  evolutionState: string;
  dbStatus: string;
  webhookUrl: string;
}

interface ChannelConnectionsPanelProps {
  /** When provided, only displays connections whose connection_type is in this list. */
  filterTypes?: string[];
}

export function ChannelConnectionsPanel({ filterTypes }: ChannelConnectionsPanelProps = {}) {
  const { canEditSettings } = useAuth();

  const [connections, setConnections] = useState<AccountConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingConnection, setAddingConnection] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  // Ticks every second while a QR code is shown — drives the countdown bar.
  const [tickNow, setTickNow] = useState(() => Date.now());
  const [statusChecks, setStatusChecks] = useState<Record<string, StatusCheckResult | null>>({});
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks connection IDs currently being auto-refreshed to prevent double-fire.
  const autoRefreshedRef = useRef<Set<string>>(new Set());
  // Refs that let the tick-driven effect read current state without being in its dep array.
  const connectionsRef = useRef<AccountConnection[]>([]);
  const connectingIdRef = useRef<string | null>(null);
  // Always holds the latest handleConnect function identity.
  const handleConnectRef = useRef<(id: string) => Promise<void>>(async () => {});

  useEffect(() => { connectionsRef.current = connections; }, [connections]);
  useEffect(() => { connectingIdRef.current = connectingId; }, [connectingId]);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/channels/connections");
      if (res.ok) {
        const { connections: data } = await res.json();
        setConnections(data ?? []);
      }
    } catch {
      toast.error("Falha ao carregar conexões de canal");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Poll while any QR is waiting to be scanned.
  useEffect(() => {
    const hasPending = connections.some((c) => c.connection_status === "qrcode_ready");

    if (hasPending && !pollRef.current) {
      pollRef.current = setInterval(fetchConnections, POLL_INTERVAL_MS);
    }
    if (!hasPending && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [connections, fetchConnections]);

  // Tick every second while a QR is shown.
  useEffect(() => {
    const hasQr = connections.some((c) => c.connection_status === "qrcode_ready");
    if (!hasQr) return;
    const timer = setInterval(() => setTickNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [connections]);

  // Auto-refresh expired QR codes. Only tick-driven — reads current state
  // through refs so it does not add connections/connectingId to its dep array
  // (that would create a feedback loop).
  useEffect(() => {
    if (connectingIdRef.current) return; // already provisioning

    for (const conn of connectionsRef.current) {
      if (
        conn.connection_type === "QR_CODE" &&
        conn.connection_status === "qrcode_ready" &&
        !autoRefreshedRef.current.has(conn.id) &&
        getQrSecondsLeft(conn, tickNow) === 0
      ) {
        autoRefreshedRef.current.add(conn.id);
        void handleConnectRef.current(conn.id);
      }
      // Once a fresh QR arrives (updated_at updated), allow future auto-refresh.
      if (autoRefreshedRef.current.has(conn.id) && getQrSecondsLeft(conn, tickNow) > 5) {
        autoRefreshedRef.current.delete(conn.id);
      }
    }
  }, [tickNow]); // intentionally only tick-driven — all other values accessed via refs

  async function handleConnect(connectionId: string): Promise<void> {
    setConnectingId(connectionId);
    try {
      const res = await fetch(`/api/channels/connections/${connectionId}/connect`, {
        method: "POST",
      });
      // Always refresh — the server may have deleted duplicate rows even on error.
      await fetchConnections();
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: null, details: null }));
        const msg = body.details
          ? `${body.error ?? "Falha ao iniciar o pareamento"}: ${body.details}`
          : body.error ?? "Falha ao iniciar o pareamento do WhatsApp";
        toast.error(msg);
      }
    } finally {
      setConnectingId(null);
    }
  }

  // Keep the ref current after every render so the tick-driven effect always
  // calls the latest closure (which captures the latest fetchConnections etc.).
  useEffect(() => { handleConnectRef.current = handleConnect; });

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
        toast.error(error ?? "Falha ao criar conexão");
        return;
      }
      const data = await res
        .json()
        .catch(() => ({ connection: null as AccountConnection | null, reused: false }));
      toast.success(
        data.reused ? "Já existe uma conexão pendente deste tipo" : "Conexão criada",
      );
      await fetchConnections();

      // QR_CODE connections still need provisioning against Evolution —
      // start that right away instead of making the admin find a second button.
      if (connectionType === "QR_CODE" && data.connection?.id) {
        await handleConnect(data.connection.id);
      }
    } finally {
      setAddingConnection(null);
    }
  }

  async function handleDisconnect(connectionId: string) {
    setRemovingId(connectionId);
    try {
      const res = await fetch(`/api/channels/connections/${connectionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        toast.error(error ?? "Falha ao desconectar");
        return;
      }
      toast.success("Desconectado");
      await fetchConnections();
    } finally {
      setRemovingId(null);
    }
  }

  async function handleCheckStatus(connectionId: string) {
    setCheckingStatusId(connectionId);
    try {
      const res = await fetch(`/api/channels/connections/${connectionId}/status`);
      if (!res.ok) {
        toast.error("Não foi possível verificar o estado da conexão Evolution");
        return;
      }
      const data: StatusCheckResult = await res.json();
      setStatusChecks((prev) => ({ ...prev, [connectionId]: data }));
    } catch {
      toast.error("Falha ao verificar estado da conexão");
    } finally {
      setCheckingStatusId(null);
    }
  }

  const displayedConnections = filterTypes
    ? connections.filter((c) => filterTypes.includes(c.connection_type))
    : connections;

  // Enforce one Evolution instance per workspace — hide "Adicionar" once any QR_CODE row exists.
  const hasQrCodeConnection = connections.some((c) => c.connection_type === "QR_CODE");
  const showAddQrButton = (!filterTypes || filterTypes.includes("QR_CODE")) && !hasQrCodeConnection;
  const showAddMetaButton = !filterTypes || filterTypes.includes("META_API");

  const hasPendingOfType = (type: "QR_CODE" | "META_API") =>
    connections.some((c) => c.connection_type === type && c.connection_status === "pending");

  const cardTitle =
    filterTypes?.length === 1 && filterTypes[0] === "QR_CODE"
      ? "Conexões Evolution (QR Code)"
      : "Conexões de canal";

  const cardDescription =
    filterTypes?.length === 1 && filterTypes[0] === "QR_CODE"
      ? "Conecte o WhatsApp escaneando o QR Code via Evolution API."
      : "Conecte o WhatsApp via QR Code (Evolution API) ou Meta API. Sua configuração existente do WhatsApp na seção WhatsApp não é afetada.";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Plug className="size-4 text-primary" />
          {cardTitle}
        </CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando...
          </div>
        ) : displayedConnections.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Nenhuma conexão encontrada. Clique em &ldquo;Adicionar conexão QR Code&rdquo; para começar.
          </p>
        ) : (
          displayedConnections.map((conn) => {
            const qrcodeBase64 = conn.metadata?.qrcode_base64 as string | undefined;
            const displayLabel = conn.label
              ? conn.label
              : conn.connection_type === "QR_CODE"
              ? "Conexão Evolution"
              : conn.connection_type;
            const providerLabel =
              conn.provider === "EVOLUTION" ? "Evolution API" : conn.provider ?? "";

            const isQrReady = conn.connection_status === "qrcode_ready";
            const secsLeft = isQrReady ? getQrSecondsLeft(conn, tickNow) : QR_LIFETIME_S;
            const isQrExpired = isQrReady && secsLeft === 0;
            const isRefreshing = connectingId === conn.id;
            const statusCheck = statusChecks[conn.id] ?? null;

            return (
              <div key={conn.id} className="space-y-2 rounded-lg border border-border p-3">
                {/* Connection header row */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{displayLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {providerLabel}
                      {conn.phone_number ? ` · ${conn.phone_number}` : ""}
                    </p>
                    {conn.connection_status === "error" && conn.last_error && (
                      <p
                        className="mt-0.5 max-w-xs truncate text-xs text-red-400"
                        title={conn.last_error}
                      >
                        {conn.last_error.length > 80
                          ? conn.last_error.slice(0, 80) + "…"
                          : conn.last_error}
                      </p>
                    )}
                    {conn.updated_at && (
                      <p className="text-xs text-muted-foreground/60">
                        Atualizado em {new Date(conn.updated_at).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status badge */}
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                        conn.connection_status === "connected" &&
                          "border-emerald-700/50 bg-emerald-950/30 text-emerald-400",
                        conn.connection_status === "disconnected" &&
                          "border-red-700/50 bg-red-950/30 text-red-400",
                        conn.connection_status === "qrcode_ready" &&
                          "border-blue-700/50 bg-blue-950/30 text-blue-400",
                        conn.connection_status === "error" &&
                          "border-red-700/50 bg-red-950/30 text-red-400",
                        conn.connection_status === "pending" &&
                          "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {statusLabel(conn.connection_status)}
                    </span>

                    {/* Verificar — shows live Evolution state for diagnostic */}
                    {canEditSettings && conn.connection_type === "QR_CODE" && conn.external_id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={checkingStatusId === conn.id}
                        onClick={() => handleCheckStatus(conn.id)}
                        title="Verificar estado da conexão no Evolution"
                        className="text-xs"
                      >
                        {checkingStatusId === conn.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          "Verificar"
                        )}
                      </Button>
                    )}

                    {/* Connect / reconnect button */}
                    {canEditSettings &&
                      conn.connection_type === "QR_CODE" &&
                      conn.connection_status !== "connected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isRefreshing}
                          onClick={() => handleConnect(conn.id)}
                        >
                          {isRefreshing ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : conn.connection_status === "disconnected" ? (
                            "Reconectar"
                          ) : conn.connection_status === "error" ? (
                            "Tentar novamente"
                          ) : conn.connection_status === "qrcode_ready" ? (
                            <>
                              <RefreshCcw className="size-3.5" />
                              Atualizar QR
                            </>
                          ) : (
                            "Gerar QR"
                          )}
                        </Button>
                      )}

                    {/* Remove */}
                    {canEditSettings && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={removingId === conn.id}
                        onClick={() => handleDisconnect(conn.id)}
                        title="Desconectar"
                      >
                        {removingId === conn.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* QR Code panel */}
                {isQrReady && (
                  <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-3">
                    {isRefreshing ? (
                      /* Provisioning in progress */
                      <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="size-8 animate-spin" />
                        <p className="text-xs">Gerando novo QR Code...</p>
                      </div>
                    ) : isQrExpired ? (
                      /* QR expired, waiting for auto-refresh */
                      <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                        <RefreshCcw className="size-6 animate-spin" />
                        <p className="text-xs">QR expirado — gerando novo...</p>
                      </div>
                    ) : qrcodeBase64 ? (
                      /* QR ready to scan */
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            qrcodeBase64.startsWith("data:")
                              ? qrcodeBase64
                              : `data:image/png;base64,${qrcodeBase64}`
                          }
                          alt="QR code do WhatsApp"
                          className="size-48"
                        />
                        {/* Countdown bar */}
                        <div className="w-48 space-y-1">
                          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                secsLeft > 15 ? "bg-emerald-500" :
                                secsLeft > 5  ? "bg-amber-500" : "bg-red-500",
                              )}
                              style={{ width: `${(secsLeft / QR_LIFETIME_S) * 100}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            <span>
                              {secsLeft > 0
                                ? `Escaneie em até ${secsLeft}s`
                                : "Expirando..."}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          WhatsApp &gt; Dispositivos conectados &gt; Conectar um dispositivo
                        </p>
                      </>
                    ) : (
                      /* provisioned but QR not yet delivered by webhook */
                      <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="size-8 animate-spin" />
                        <p className="text-xs">Aguardando QR Code...</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Inline diagnostic block (shown after clicking "Verificar") */}
                {statusCheck && (
                  <div className="space-y-1 rounded-md border border-border bg-muted/30 p-2.5 text-xs">
                    <p className="font-medium text-foreground">Diagnóstico Evolution</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Estado no servidor:</span>
                      <span
                        className={cn(
                          "font-medium",
                          statusCheck.evolutionState === "open" && "text-emerald-400",
                          statusCheck.evolutionState === "close" && "text-red-400",
                          statusCheck.evolutionState === "connecting" && "text-amber-400",
                          !["open", "close", "connecting"].includes(statusCheck.evolutionState) &&
                            "text-muted-foreground",
                        )}
                      >
                        {statusCheck.evolutionState === "open"
                          ? "Conectado (open)"
                          : statusCheck.evolutionState === "close"
                          ? "Desconectado (close)"
                          : statusCheck.evolutionState === "connecting"
                          ? "Conectando..."
                          : statusCheck.evolutionState}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Status local:</span>
                      <span className="font-medium">{statusCheck.dbStatus}</span>
                    </div>
                    {statusCheck.evolutionState === "open" &&
                      statusCheck.dbStatus !== "connected" && (
                        <p className="text-amber-400">
                          Evolution está conectado mas o webhook não chegou. Verifique
                          EVOLUTION_WEBHOOK_TOKEN e NEXT_PUBLIC_SITE_URL no Vercel.
                        </p>
                      )}
                    {statusCheck.evolutionState === "close" &&
                      statusCheck.dbStatus === "qrcode_ready" && (
                        <p className="text-blue-400">
                          QR gerado, aguardando leitura. Se você já escaneou, o QR
                          pode ter expirado — clique &ldquo;Atualizar QR&rdquo;.
                        </p>
                      )}
                    {statusCheck.evolutionState.startsWith("error:") && (
                      <p className="text-red-400">
                        Não foi possível contactar a Evolution API:{" "}
                        {statusCheck.evolutionState.replace("error: ", "")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {canEditSettings && (showAddQrButton || showAddMetaButton) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {showAddQrButton && (
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
                {hasPendingOfType("QR_CODE") ? "QR Code pendente" : "Adicionar conexão QR Code"}
              </Button>
            )}
            {showAddMetaButton && (
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
                {hasPendingOfType("META_API") ? "Meta API pendente" : "Adicionar conexão Meta API"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
