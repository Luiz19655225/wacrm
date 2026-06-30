// Thin client for the Evolution API management/messaging endpoints.
// Mirrors the role of src/lib/whatsapp/meta-api.ts, but for the
// Evolution provider (Fase 3). Auth is a single global apikey for the
// whole Evolution server (EVOLUTION_API_KEY) — there is no per-instance
// secret to store, so account_connections.credentials_encrypted stays
// NULL for EVOLUTION rows by design (see Fase 3 plan, "Segurança").

function evolutionApiUrl(): string {
  const url = process.env.EVOLUTION_API_URL
  if (!url) throw new Error('EVOLUTION_API_URL is not configured')
  return url.replace(/\/$/, '')
}

function evolutionApiKey(): string {
  const key = process.env.EVOLUTION_API_KEY
  if (!key) throw new Error('EVOLUTION_API_KEY is not configured')
  return key
}

async function evolutionFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${evolutionApiUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: evolutionApiKey(),
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Evolution API ${path} failed: ${res.status} ${body}`)
  }

  return res.json() as Promise<T>
}

export interface CreateInstanceResult {
  instanceName: string
  /**
   * Some Evolution deployments return the QR code synchronously here;
   * others only ever deliver it via the QRCODE_UPDATED webhook event.
   * Treat this as a bonus fast-path, never the only source of truth —
   * the webhook handler (src/lib/whatsapp/evolution-webhook-processor.ts)
   * is what actually keeps account_connections.metadata.qrcode_base64
   * current.
   */
  qrcodeBase64: string | null
}

/**
 * Creates (or re-creates) an Evolution instance and registers our
 * webhook against it. `instanceName` is always the account_id — a
 * stable 1:1 mapping that lets the webhook resolve account_id straight
 * back out of account_connections.external_id without a side table.
 */
export async function createInstance(
  instanceName: string,
  webhookUrl: string,
  webhookToken: string,
): Promise<CreateInstanceResult> {
  const data = await evolutionFetch<{
    qrcode?: { base64?: string }
  }>('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url: webhookUrl,
        headers: { Authorization: `Bearer ${webhookToken}` },
        byEvents: true,  // fire only for the events listed below, not all events
        events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT'],
      },
    }),
  })

  return {
    instanceName,
    qrcodeBase64: data?.qrcode?.base64 ?? null,
  }
}

/**
 * Live reconciliation fallback — not used in the webhook-driven happy
 * path, but available for a future "stuck on qrcode_ready" recovery
 * check (registered as a known gap in the Fase 3 plan, not built yet).
 */
export async function fetchConnectionState(instanceName: string): Promise<string> {
  const data = await evolutionFetch<{ instance?: { state?: string } }>(
    `/instance/connectionState/${instanceName}`,
  )
  return data?.instance?.state ?? 'unknown'
}

/**
 * Inbound media download — POST /chat/getBase64FromMediaMessage/{instance}.
 * Confirmed against the Evolution API source (EvolutionAPI/evolution-api,
 * src/api/routes/chat.router.ts + chat.controller.ts +
 * whatsapp.baileys.service.ts#getBase64FromMediaMessage, June 2026):
 *   - body: { message: <full WAMessageInfo envelope (key + message)>, convertToMp4?: boolean }
 *     `message` is exactly the shape of the `data` payload Evolution already
 *     sends on the `messages.upsert` webhook event — no separate fetch needed.
 *   - response: { mediaType, fileName, caption, size, mimetype, base64, buffer }
 *     `buffer` is always null over REST; only `base64` carries the bytes.
 */
export interface EvolutionMediaResult {
  mediaType: string
  fileName: string
  caption?: string
  mimetype: string
  base64: string
}

export async function getBase64FromMediaMessage(
  instanceName: string,
  message: unknown,
): Promise<EvolutionMediaResult> {
  return evolutionFetch(`/chat/getBase64FromMediaMessage/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({ message, convertToMp4: false }),
  })
}

export async function sendTextMessage(
  instanceName: string,
  phone: string,
  text: string,
): Promise<{ key?: { id?: string } }> {
  return evolutionFetch(`/message/sendText/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({ number: phone, text }),
  })
}

export async function sendMediaMessage(
  instanceName: string,
  phone: string,
  mediaUrl: string,
  mediaType: 'image' | 'video' | 'document' | 'audio',
  caption?: string,
): Promise<{ key?: { id?: string } }> {
  return evolutionFetch(`/message/sendMedia/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      number: phone,
      mediatype: mediaType,
      media: mediaUrl,
      caption,
    }),
  })
}

export async function deleteInstance(instanceName: string): Promise<void> {
  await evolutionFetch(`/instance/delete/${instanceName}`, { method: 'DELETE' })
}
