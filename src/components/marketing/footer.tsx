import Link from "next/link";
import { WavonLogoReduced } from "@/components/brand/wavon-logo";

const LEGAL_LINKS = [
  { href: "/politica-de-privacidade", label: "Privacidade" },
  { href: "/termos-de-uso", label: "Termos de Uso" },
  { href: "/cookies", label: "Cookies" },
  { href: "/lgpd", label: "LGPD" },
  { href: "/exclusao-de-dados", label: "Exclusão de Dados" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" aria-label="WAVON — página inicial">
            <WavonLogoReduced />
          </Link>

          <nav aria-label="Links institucionais" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {LEGAL_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ))}
            <a
              href="mailto:comercial@wavon.com.br"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Contato
            </a>
          </nav>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} WAVON. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
