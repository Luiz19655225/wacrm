import Link from "next/link";
import { WavonLogoReduced } from "@/components/brand/wavon-logo";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <Link href="/">
          <WavonLogoReduced />
        </Link>
        <p>© {new Date().getFullYear()} WAVON. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
