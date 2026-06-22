import Link from "next/link";
import { WavonLogoReduced } from "@/components/brand/wavon-logo";
import { buttonVariants } from "@/components/ui/button";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/">
          <WavonLogoReduced />
        </Link>

        <nav className="hidden items-center gap-10 text-sm font-medium text-muted-foreground sm:flex">
          <a href="#recursos" className="transition-colors hover:text-foreground">
            Recursos
          </a>
          <a href="#como-funciona" className="transition-colors hover:text-foreground">
            Como funciona
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", className: "px-3" })}
          >
            Entrar
          </Link>
          <a
            href="#demo"
            className={buttonVariants({
              variant: "ghost",
              className: "bg-gradient-to-r from-[#2f5fff] to-[#8b5cf6] px-4 text-white hover:opacity-90",
            })}
          >
            Solicitar demonstração
          </a>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/50 to-transparent"
      />
    </header>
  );
}
