import Link from "next/link";
import { WavonMark } from "@/components/brand/wavon-mark";
import { buttonVariants } from "@/components/ui/button";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <WavonMark className="h-8 w-8" />
          <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
            WAVON
          </span>
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
          <Link
            href="/signup"
            className={buttonVariants({ variant: "default", className: "px-4" })}
          >
            Criar conta
          </Link>
        </div>
      </div>
    </header>
  );
}
