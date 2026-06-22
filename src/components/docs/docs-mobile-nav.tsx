"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DocsNavLinks } from "./docs-nav-links";

// Mobile-only entry point to the docs navigation. The sidebar is hidden
// below md (768px) so it never squeezes the article column on phone
// widths (~375-414px); this drawer is the replacement nav surface there.
export function DocsMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6 md:hidden">
      <Button
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-4 w-4" />
        Navegação da documentação
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-3/4 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Documentação</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <DocsNavLinks onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
