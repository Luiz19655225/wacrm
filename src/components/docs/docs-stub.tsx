import { DocsArticle } from "./docs-article";
import { DocsPager } from "./docs-pager";

interface DocsStubProps {
  title: string;
  currentHref: string;
}

// Placeholder for a docs page whose content hasn't been written yet.
// Keeps the route navigable (sidebar links don't 404) ahead of the
// real content landing — swap for the final <DocsArticle> once the
// copy is ready.
export function DocsStub({ title, currentHref }: DocsStubProps) {
  return (
    <DocsArticle>
      <h1>{title}</h1>
      <p>Esta página está em construção. O conteúdo completo chega em breve.</p>
      <DocsPager currentHref={currentHref} />
    </DocsArticle>
  );
}
