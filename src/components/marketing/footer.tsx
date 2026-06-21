import Link from "next/link";
import { WavonMark } from "@/components/brand/wavon-mark";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <WavonMark className="h-6 w-6" />
          <span className="font-heading font-semibold text-foreground">
            WAVON
          </span>
        </Link>
        <p>© {new Date().getFullYear()} WAVON. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
