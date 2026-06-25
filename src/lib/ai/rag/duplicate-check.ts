import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/ai/admin-client'

// ------------------------------------------------------------
// Duplicate DETECTION only — never automatic dedup. Whether to reuse
// an existing document or upload again anyway is the account's own
// call (each company decides), surfaced as a choice in the upload
// route/UI, not enforced as a system rule. See route.ts: a duplicate
// hash makes the route respond 409 with the existing document; the
// caller must resend with `force: true` to proceed anyway. There is
// deliberately no UNIQUE constraint on content_hash (migration 035).
// ------------------------------------------------------------

export function hashFileContent(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export interface DuplicateDocument {
  id: string
  file_name: string
  status: string
  created_at: string
}

/**
 * Looks for an existing, non-errored document with the same content
 * hash in this account. Returns null on any lookup failure — duplicate
 * detection is a convenience, never a reason to block an upload that
 * would otherwise succeed.
 */
export async function findDuplicateDocument(
  accountId: string,
  contentHash: string,
): Promise<DuplicateDocument | null> {
  try {
    const { data, error } = await supabaseAdmin()
      .from('ai_documents')
      .select('id, file_name, status, created_at')
      .eq('account_id', accountId)
      .eq('content_hash', contentHash)
      .neq('status', 'error')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return null
    return data as DuplicateDocument
  } catch (err) {
    console.error('[rag] findDuplicateDocument failed (treating as no duplicate):', err)
    return null
  }
}
