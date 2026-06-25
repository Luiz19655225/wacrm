import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/ai/admin-client'
import { getAccountAiSettings } from '@/lib/ai/ai-settings'
import { resolveFileType, processDocument } from '@/lib/ai/rag'

// ------------------------------------------------------------
// POST /api/ai/knowledge-documents
//
// The only route in the RAG feature that does real server-side work
// (storage write + text extraction + the account's OpenAI key) — read
// access to the document list doesn't need a route at all, same as
// every other Fase 6 knowledge-base table (RLS lets any member read
// directly). This route is intentionally thin: auth + validation +
// storage upload + a row insert, then it hands off to
// processDocument() (src/lib/ai/rag) for everything document-specific.
// ------------------------------------------------------------

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB, matches migration 034's bucket limit
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

    const account = await resolveAccountAndRole(supabase, user.id)
    if (!account) {
      return NextResponse.json({ error: 'Seu perfil não está vinculado a uma conta.' }, { status: 403 })
    }
    if (account.role !== 'admin' && account.role !== 'owner') {
      return NextResponse.json(
        { error: 'Apenas administradores podem enviar documentos para a IA.' },
        { status: 403 },
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'O arquivo está vazio.' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'O arquivo excede o limite de 15 MB.' }, { status: 400 })
    }

    const fileType = resolveFileType(file.type, file.name)
    if (!fileType) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Envie PDF, DOCX, PPTX, XLSX, CSV ou TXT.' },
        { status: 400 },
      )
    }

    const aiSettings = await getAccountAiSettings(account.accountId)
    if (!aiSettings) {
      return NextResponse.json(
        { error: 'Configure a chave da OpenAI em Configurações → IA antes de enviar documentos.' },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const extension = file.name.split('.').pop() || fileType
    const storagePath = `account-${account.accountId}/${randomUUID()}.${extension}`

    const db = supabaseAdmin()

    const { error: uploadError } = await db.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: file.type || undefined,
      upsert: false,
    })
    if (uploadError) {
      console.error('[knowledge-documents POST] storage upload failed:', uploadError)
      return NextResponse.json({ error: 'Falha ao enviar o arquivo.' }, { status: 500 })
    }

    const { data: document, error: insertError } = await db
      .from('ai_documents')
      .insert({
        account_id: account.accountId,
        file_name: file.name,
        file_type: fileType,
        storage_path: storagePath,
        file_size_bytes: file.size,
        status: 'processing',
        uploaded_by: user.id,
      })
      .select('id, file_name, file_type, status, chunk_count, created_at')
      .single()

    if (insertError || !document) {
      console.error('[knowledge-documents POST] insert failed:', insertError)
      await db.storage.from(BUCKET).remove([storagePath])
      return NextResponse.json({ error: 'Falha ao registrar o documento.' }, { status: 500 })
    }

    // Synchronous processing — fine for the document sizes this
    // feature targets, and keeps this phase free of queue/worker
    // infrastructure. Errors are captured on the document row itself
    // (status: 'error'), never thrown back as a 500 here.
    await processDocument({
      accountId: account.accountId,
      documentId: document.id,
      buffer,
      fileType,
      apiKey: aiSettings.apiKey,
    })

    const { data: finalDocument } = await db
      .from('ai_documents')
      .select('id, file_name, file_type, status, error_message, chunk_count, created_at')
      .eq('id', document.id)
      .single()

    return NextResponse.json({ document: finalDocument ?? document })
  } catch (error) {
    console.error('Error in /api/ai/knowledge-documents POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
