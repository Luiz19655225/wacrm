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

/**
 * Channel connections — Fase 3.
 *
 * Extracted out of billing-panel.tsx (where this card lived since
 * Fase 1, purely by co-location, not because it's a billing concern)
 * so WhatsApp/Evolution work never has to touch the billing component.
 * Fully self-contained: fetches its own data, polls on its own while a
 * QR pairing is in flight. Your existing WhatsApp setup in the
 * WhatsApp section is a separate table (whatsapp_config) and is
 * unaffected by anything here.
 */

const POLL_INTERVAL_MS = 4000;

export function ChannelConnectionsPanel() {
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
      toast.error("Failed to load channel connections");
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
        toast.error(error ?? "Failed to start WhatsApp pairing");
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
        toast.error(error ?? "Failed to create connection");
        return;
      }
      const data = await res
        .json()
        .catch(() => ({ connection: null as AccountConnection | null, reused: false }));
      toast.success(
        data.reused ? "A pending connection of this type already exists" : "Connection created",
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
        toast.error(error ?? "Failed to disconnect");
        return;
      }
      toast.success("Disconnected");
      await fetchConnections();
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Plug className="size-4 text-primary" />
          Channel connections
        </CardTitle>
        <CardDescription>
          Connect WhatsApp via QR Code (Evolution API) or Meta API. Your
          existing WhatsApp setup in the WhatsApp section is unaffected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading...
          </div>
        ) : (
          connections.map((conn) => {
            const qrcodeBase64 = conn.metadata?.qrcode_base64 as string | undefined;
            return (
              <div key={conn.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {conn.label ?? conn.connection_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conn.provider} · {conn.connection_status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{conn.connection_status}</Badge>
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
                          ) : (
                            "Generate QR"
                          )}
                        </Button>
                      )}
                    {canEditSettings && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={removingId === conn.id}
                        onClick={() => handleDisconnect(conn.id)}
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
                      alt="WhatsApp QR code"
                      className="size-48"
                    />
                    <p className="text-xs text-muted-foreground">
                      Scan with WhatsApp &gt; Linked devices &gt; Link a device.
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}

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
  );
}
