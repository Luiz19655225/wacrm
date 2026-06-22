import { DocsNavLinks } from "./docs-nav-links";

// Static sidebar — visible from md (768px) up. Below that, DocsMobileNav
// renders the same DocsNavLinks inside a drawer instead, so the docs
// content never gets squeezed by a fixed-width column on small screens.
export function DocsSidebar() {
  return (
    <nav aria-label="Documentação" className="hidden w-56 shrink-0 md:block">
      <DocsNavLinks />
    </nav>
  );
}
