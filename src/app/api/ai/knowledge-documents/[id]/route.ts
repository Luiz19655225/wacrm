import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/ai/admin-client'

const BUCKET = 'ai-knowledge-documents'

async function resolveAccountAndRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ accountId: string; role: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id, account_role')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data?.account_id) return null
  return { accountId: data.account_id as string, role: data.account_role as string }
}

/**
 * DELETE /api/ai/knowledge-documents/[id]
 *
 * Removes the storage object and the ai_documents row. Its chunks
 * (ai_document_chunks) disappear via ON DELETE CASCADE — there's no
 * separate "delete chunks" step to keep in sync.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const account = await resolveAccountAndRole(supabase, user.id)
    if (!account) {
      return NextResponse.json({ error: 'Seu perfil não está vinculado a uma conta.' }, { status: 403 })
    }
    if (account.role !== 'admin' && account.role !== 'owner') {
      return NextResponse.json(
        { error: 'Apenas administradores podem excluir documentos da IA.' },
        { status: 403 },
      )
    }

    const db = supabaseAdmin()

    const { data: document, error: fetchError } = await db
      .from('ai_documents')
      .select('id, storage_path')
      .eq('id', id)
      .eq('account_id', account.accountId)
      .maybeSingle()

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
    }

    await db.storage.from(BUCKET).remove([document.storage_path])

    const { error: deleteError } = await db
      .from('ai_documents')
      .delete()
      .eq('id', id)
      .eq('account_id', account.accountId)
    if (deleteError) {
      console.error('[knowledge-documents DELETE] failed:', deleteError)
      return NextResponse.json({ error: 'Falha ao excluir o documento.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in /api/ai/knowledge-documents/[id] DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
