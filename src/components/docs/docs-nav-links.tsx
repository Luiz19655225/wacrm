"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DOCS_NAV } from "./docs-nav-items";

// Shared nav-link list rendered both by the static desktop sidebar and
// the mobile drawer (DocsMobileNav) — keeps active-state logic in one
// place. `onNavigate` lets the drawer close itself after a link click.
export function DocsNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <ul className="flex flex-col gap-1 pb-2">
        <li>
          <Link
            href="/docs"
            onClick={onNavigate}
            className={cn(
              "block rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              pathname === "/docs"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Início
          </Link>
        </li>
      </ul>

      {DOCS_NAV.map((group) => (
        <div key={group.title} className="mb-6">
          <p className="px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {group.title}
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "block rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}
