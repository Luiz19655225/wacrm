import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DOCS_NAV } from "./docs-nav-items";

const FLAT_PAGES = [
  { href: "/docs", label: "Início" },
  ...DOCS_NAV.flatMap((group) => group.items),
];

export function DocsPager({ currentHref }: { currentHref: string }) {
  const index = FLAT_PAGES.findIndex((p) => p.href === currentHref);
  if (index === -1) return null;

  const prev = index > 0 ? FLAT_PAGES[index - 1] : null;
  const next = index < FLAT_PAGES.length - 1 ? FLAT_PAGES[index + 1] : null;
  if (!prev && !next) return null;

  return (
    <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
      {prev ? (
        <Link
          href={prev.href}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {prev.label}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={next.href}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          {next.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
