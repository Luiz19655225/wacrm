const CONTENT_TYPE_LABEL: Record<string, string> = {
  text: '',
  image: '📷 Foto',
  document: '📄 Documento',
  audio: '🎵 Áudio',
  video: '🎥 Vídeo',
  location: '📍 Localização',
  template: '📋 Modelo',
  interactive: '↩️ Resposta',
}

/**
 * Conversation-list preview text for a message. Mirrors WhatsApp's own
 * inbox: media without a caption shows a friendly pt-BR label instead of
 * a raw content_type string like "[image]".
 */
export function buildLastMessagePreview(
  contentType: string,
  contentText?: string | null,
): string {
  if (contentText) return contentText
  return CONTENT_TYPE_LABEL[contentType] || ''
}
