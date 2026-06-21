import { WavonMark } from "./wavon-mark";

/**
 * Horizontal reduced lockup — symbol + wordmark, no subtitle. Used in
 * persistent UI chrome (marketing nav, sidebar, footer) where there's
 * no room for the full tagline and the visitor doesn't need it
 * repeated on every screen.
 */
export function WavonLogoReduced({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <WavonMark className="h-8 w-auto" />
      <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
        WAVON
      </span>
    </div>
  );
}

/**
 * Primary stacked lockup — symbol, wordmark, and the
 * "CRM • WHATSAPP • AUTOMAÇÕES" tagline. Reserved for first-impression
 * moments (currently just /login) where there's room to make the full
 * positioning statement once, instead of in chrome the visitor sees
 * repeatedly.
 */
export function WavonLogoPrimary({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      <WavonMark className="h-16 w-auto" />
      <span className="font-heading text-2xl font-bold tracking-tight text-foreground">
        WAVON
      </span>
      <span className="text-xs font-medium tracking-widest text-muted-foreground">
        CRM • WHATSAPP • AUTOMAÇÕES
      </span>
    </div>
  );
}
