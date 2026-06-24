import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveConversationContext } from '@/lib/ai/route-helpers'
import { classifyLead } from '@/lib/ai/inbox-assistant'

/**
 * POST /api/ai/inbox/classify-lead
 * Body: { conversation_id: string }
 *
 * Returns the classification + reason only — does not write anything
 * to the contact/deal. Persisting the classification (e.g. as a tag)
 * is a follow-up phase once the agent has validated the AI's read on
 * real conversations.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const conversationId = body?.conversation_id
    if (!conversationId) {
      return NextResponse.json({ error: 'conversation_id é obrigatório' }, { status: 400 })
    }

    const context = await resolveConversationContext(supabase, user.id, conversationId)
    if (!context.ok) {
      return NextResponse.json({ error: context.error }, { status: context.status })
    }

    const result = await classifyLead({
      accountId: context.data.accountId,
      conversationId,
      messages: context.data.messages,
      contactName: context.data.contactName,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 200 })
    }
    return NextResponse.json({ classification: result.data })
  } catch (error) {
    console.error('Error in /api/ai/inbox/classify-lead POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
