import { DocsNav } from "@/components/docs/docs-nav";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { DocsMobileNav } from "@/components/docs/docs-mobile-nav";
import { Footer } from "@/components/marketing/footer";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DocsNav />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-10 px-4 py-10 sm:px-6">
        <DocsSidebar />
        {/* min-w-0 lets this flex item shrink below its content's intrinsic
            width instead of overflowing the row — overflow-hidden would
            do the same but risks clipping wide content (code, long links). */}
        <main className="min-w-0 flex-1">
          <DocsMobileNav />
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
