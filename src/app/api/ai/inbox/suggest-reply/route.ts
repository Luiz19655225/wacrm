import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveConversationContext } from '@/lib/ai/route-helpers'
import { suggestReply } from '@/lib/ai/inbox-assistant'

/**
 * POST /api/ai/inbox/suggest-reply
 * Body: { conversation_id: string }
 *
 * Returns a suggested reply for the agent to review — never sends
 * anything. The composer inserts the text; the human clicks Send.
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

    const result = await suggestReply({
      accountId: context.data.accountId,
      conversationId,
      messages: context.data.messages,
      contactName: context.data.contactName,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 200 })
    }
    return NextResponse.json({ suggestion: result.data.suggestion })
  } catch (error) {
    console.error('Error in /api/ai/inbox/suggest-reply POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
