import Image from "next/image";

// Intrinsic pixel size of public/brand/wavon-symbol.png — required by
// next/image since the asset is referenced by public URL path (not a
// static import), so it can compute the right aspect ratio.
const SYMBOL_WIDTH = 669;
const SYMBOL_HEIGHT = 455;

interface WavonMarkProps {
  /** Controls rendered height; width follows the asset's aspect ratio. e.g. "h-8 w-auto". */
  className?: string;
}

/**
 * WAVON brand symbol — the official "Wi" ribbon mark (cropped from
 * the approved logo artwork, background removed). Rendered directly
 * on whatever surface it sits on, with no background tile — that's
 * how the source artwork itself presents it. Don't reintroduce a
 * colored box around it; that was an earlier placeholder design, not
 * part of the official mark.
 */
export function WavonMark({ className }: WavonMarkProps) {
  return (
    <Image
      src="/brand/wavon-symbol.png"
      alt="WAVON"
      width={SYMBOL_WIDTH}
      height={SYMBOL_HEIGHT}
      className={className ?? "h-8 w-auto"}
      priority
    />
  );
}
