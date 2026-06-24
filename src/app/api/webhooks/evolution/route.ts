// ============================================================
// /api/webhooks/evolution
//
// Inbound Evolution API webhook receiver. No Supabase session — same
// posture as /api/billing/webhook: authenticity comes from a static
// bearer token (EVOLUTION_WEBHOOK_TOKEN) configured on the Evolution
// instance's webhook settings, checked with crypto.timingSafeEqual
// (not ===) to avoid a timing side-channel, mirroring
// src/app/api/billing/webhook/route.ts's isAuthorized().
//
// Only ever uses supabaseAdmin() (service role) downstream — there is
// no end-user session to scope an RLS-bound client to here.
// ============================================================

import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  processEvolutionWebhookEvent,
  type EvolutionWebhookPayload,
} from '@/lib/whatsapp/evolution-webhook-processor'

function isAuthorized(request: Request): boolean {
  const expected = process.env.EVOLUTION_WEBHOOK_TOKEN
  if (!expected) {
    console.error('[evolution webhook] EVOLUTION_WEBHOOK_TOKEN is not set — rejecting request.')
    return false
  }

  const header = request.headers.get('authorization')
  const provided = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : header
  if (!provided) return false

  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(provided)
  if (expectedBuf.length !== providedBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, providedBuf)
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: EvolutionWebhookPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Awaited (unlike the Meta webhook's fire-and-forget dispatch):
  // Vercel can suspend/tear down the function right after the
  // response is sent, and the detached promise here was getting cut
  // off mid-chain (contact/conversation created, then the later
  // message insert failing with a bare "TypeError: fetch failed").
  // Evolution's webhook timeout is generous enough to afford the
  // extra wait, so this trades a few hundred ms for correctness.
  try {
    await processEvolutionWebhookEvent(payload)
  } catch (error) {
    console.error('[evolution webhook] processing failed:', error)
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
