import Link from "next/link";
import { WavonLogoReduced } from "@/components/brand/wavon-logo";
import { COMPANY } from "@/lib/company";

const LEGAL_LINKS = [
  { href: "/politica-de-privacidade", label: "Política de Privacidade" },
  { href: "/termos-de-uso", label: "Termos de Uso" },
  { href: "/lgpd", label: "LGPD" },
  { href: "/cookies", label: "Cookies" },
  { href: "/exclusao-de-dados", label: "Exclusão de Dados" },
] as const;

const whatsappHref = `https://wa.me/${COMPANY.contact.whatsappRaw[0]}`;

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Coluna institucional */}
          <div>
            <Link href="/" aria-label="WAVON — página inicial" className="inline-block">
              <WavonLogoReduced />
            </Link>
            <address className="mt-5 space-y-1 text-xs not-italic leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">{COMPANY.tradeName}</p>
              <p>{COMPANY.legalName}</p>
              <p>CNPJ: {COMPANY.cnpj}</p>
              <p>{COMPANY.address.full}</p>
            </address>
          </div>

          {/* Coluna de contato */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">Atendimento</h3>
            <ul className="mt-4 space-y-2 text-xs leading-6 text-muted-foreground">
              <li>
                <a
                  href={`mailto:${COMPANY.contact.supportEmail}`}
                  className="transition-colors hover:text-foreground"
                >
                  {COMPANY.contact.supportEmail}
                </a>
              </li>
              <li>
                Telefone:{" "}
                <a
                  href={`tel:+55${COMPANY.contact.phoneRaw}`}
                  className="transition-colors hover:text-foreground"
                >
                  {COMPANY.contact.phone}
                </a>
              </li>
              <li>
                WhatsApp:{" "}
                <a href={whatsappHref} className="transition-colors hover:text-foreground">
                  {COMPANY.contact.whatsapp[0]}
                </a>
              </li>
              <li>{COMPANY.contact.whatsapp[1]}</li>
              <li>{COMPANY.businessHours}</li>
            </ul>
          </div>

          {/* Coluna jurídica */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">Institucional</h3>
            <nav aria-label="Links institucionais" className="mt-4 flex flex-col gap-2">
              {LEGAL_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {COMPANY.tradeName} — {COMPANY.legalName}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
