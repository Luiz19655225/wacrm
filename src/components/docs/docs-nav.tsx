import Link from "next/link";
import { WavonLogoReduced } from "@/components/brand/wavon-logo";
import { buttonVariants } from "@/components/ui/button";
import { ModeToggle } from "@/components/layout/mode-toggle";

export function DocsNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/docs">
            <WavonLogoReduced />
          </Link>
          <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Docs
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle />
          <Link
            href="/"
            className={buttonVariants({ variant: "ghost", className: "px-3" })}
          >
            Voltar ao site
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "default", className: "px-4" })}
          >
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}
