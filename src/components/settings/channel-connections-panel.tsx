"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plug, QrCode, Trash2 } from "lucide-react";

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
import type { AccountConnection } from "@/types";

const POLL_INTERVAL_MS = 4000;

const STATUS_LABELS: Record<string, string> = {
  pending: "pendente",
  qrcode_ready: "QR code pronto",
  connected: "conectado",
  disconnected: "desconectado",
  failed: "falhou",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/channels/connections");
      if (res.ok) {
        const { connections } = await res.json();
        setConnections(connections ?? []);
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

  // While any connection is mid-pairing, poll the existing GET list
  // endpoint so the QR code (written by the Evolution webhook into
  // metadata.qrcode_base64) and the eventual "connected" transition
  // show up without a manual refresh. No dedicated status endpoint —
  // see Fase 3 plan for why this is intentional, not a placeholder.
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

  const displayedConnections = filterTypes
    ? connections.filter((c) => filterTypes.includes(c.connection_type))
    : connections;

  const showAddQrButton = !filterTypes || filterTypes.includes("QR_CODE");
  const showAddMetaButton = !filterTypes || filterTypes.includes("META_API");

  const hasPendingOfType = (type: "QR_CODE" | "META_API") =>
    connections.some((c) => c.connection_type === type && c.connection_status === "pending");

  async function handleConnect(connectionId: string) {
    setConnectingId(connectionId);
    try {
      const res = await fetch(`/api/channels/connections/${connectionId}/connect`, {
        method: "POST",
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }));
        toast.error(error ?? "Falha ao iniciar o pareamento do WhatsApp");
        return;
      }
      await fetchConnections();
    } finally {
      setConnectingId(null);
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
      // start that right away instead of making the admin find a
      // second button for what's really one action.
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

  const cardTitle = filterTypes?.length === 1 && filterTypes[0] === "QR_CODE"
    ? "Conexões Evolution (QR Code)"
    : "Conexões de canal";

  const cardDescription = filterTypes?.length === 1 && filterTypes[0] === "QR_CODE"
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
            return (
              <div key={conn.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {conn.label ?? conn.connection_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conn.provider}
                      {conn.phone_number ? ` · ${conn.phone_number}` : ""}
                      {" · "}
                      {statusLabel(conn.connection_status)}
                    </p>
                    {conn.updated_at && (
                      <p className="text-xs text-muted-foreground/60">
                        Atualizado em {new Date(conn.updated_at).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{statusLabel(conn.connection_status)}</Badge>
                    {canEditSettings &&
                      conn.connection_type === "QR_CODE" &&
                      conn.connection_status !== "connected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={connectingId === conn.id}
                          onClick={() => handleConnect(conn.id)}
                        >
                          {connectingId === conn.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : conn.connection_status === "disconnected" ? (
                            "Reconectar"
                          ) : (
                            "Gerar QR"
                          )}
                        </Button>
                      )}
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

                {conn.connection_status === "qrcode_ready" && qrcodeBase64 && (
                  <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-3">
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
                    <p className="text-xs text-muted-foreground">
                      Escaneie em WhatsApp &gt; Dispositivos conectados &gt; Conectar um dispositivo.
                    </p>
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
