import Link from "next/link";
import { WavonLogoReduced } from "@/components/brand/wavon-logo";
import { buttonVariants } from "@/components/ui/button";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/">
          <WavonLogoReduced />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground sm:flex">
          <a href="#recursos" className="hover:text-foreground">
            Recursos
          </a>
          <a href="#como-funciona" className="hover:text-foreground">
            Como funciona
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={buttonVariants({ variant: "ghost", className: "px-3" })}
          >
            Entrar
          </Link>
          <a
            href="#demo"
            className={buttonVariants({ variant: "default", className: "px-4" })}
          >
            Solicitar demonstração
          </a>
        </div>
      </div>
    </header>
  );
}
