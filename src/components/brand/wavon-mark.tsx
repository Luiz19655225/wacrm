interface WavonMarkProps {
  /** Outer rounded-square size, e.g. "h-8 w-8". Glyph scales with it. */
  className?: string;
}

/**
 * WAVON brand glyph — two overlapping wave chevrons forming an
 * abstract "W" (wave + on), white on the brand's blue-to-violet
 * gradient. Used anywhere the wordmark needs an icon companion
 * (sidebar, login, marketing nav). Deliberately original — avoids
 * the generic chat-bubble glyph the previous template shared with
 * WhatsApp/Messenger.
 */
export function WavonMark({ className }: WavonMarkProps) {
  return (
    <div
      className={`bg-wavon-gradient flex items-center justify-center rounded-lg ${className ?? "h-8 w-8"}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[55%] w-[55%]">
        <path
          d="M3 7 L7.5 17 L12 9 L16.5 17 L21 7"
          stroke="#ffffff"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
