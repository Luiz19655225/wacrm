import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveConversationContext } from '@/lib/ai/route-helpers'
import { getConversationInsights } from '@/lib/ai/inbox-assistant'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const conversationId = req.nextUrl.searchParams.get('conversation_id')
  if (!conversationId) {
    return NextResponse.json({ error: 'conversation_id é obrigatório.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const ctx = await resolveConversationContext(supabase, user.id, conversationId)
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }

  const result = await getConversationInsights({
    accountId: ctx.data.accountId,
    conversationId,
    messages: ctx.data.messages,
    contactName: ctx.data.contactName,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 })
  }

  return NextResponse.json(result.data)
}
