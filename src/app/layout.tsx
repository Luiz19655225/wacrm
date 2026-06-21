import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { ThemedToaster } from "@/components/themed-toaster";
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  LEGACY_MODE_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  MODE_STORAGE_KEY,
  MODES,
  STORAGE_KEY,
  THEME_IDS,
} from "@/lib/themes";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Headline font for marketing/brand surfaces (landing hero, sidebar +
// login wordmark). Kept separate from --font-sans (the dashboard UI
// font) via its own CSS variable, wired to the `font-heading` utility
// in globals.css — everyday UI text is untouched.
const interTight = Inter_Tight({
  variable: "--font-heading-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Resolves relative OG/Twitter image URLs (e.g. /opengraph-image) to
  // the production domain instead of localhost.
  metadataBase: new URL("https://wavon.com.br"),
  title: {
    default: "WAVON",
    template: "%s — WAVON",
  },
  description: "WAVON — CRM omnichannel para WhatsApp.",
  // Indexable by default: the public marketing site lives at "/".
  // (auth) and (dashboard) route groups declare their own `noindex`
  // metadata, which Next merges over this for those subtrees.
  //
  // No manual `icons` entry here — favicon.ico, icon.tsx, apple-icon.tsx
  // and manifest.ts are all file-convention routes Next.js auto-detects
  // and injects the right <link> tags for. Listing them here too would
  // just duplicate (or conflict with) what the conventions already emit.
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0e0e16",
  colorScheme: "dark light",
};

// Inline boot script — runs before React hydrates so the user's
// chosen accent (data-theme) AND mode (data-mode) are on the <html>
// element before first paint. Without this every page load flashes
// the server-rendered defaults for a frame before the React tree
// mounts and applies the picked values.
//
// Kept dependency-free (no imports, no JSX) — must be a string the
// browser can run as a single <script>. Knowledge of valid ids is
// sourced from the THEME_IDS / MODES constants so adding one doesn't
// silently break the boot path.
const THEME_BOOT_SCRIPT = `
(function(){
  var d = document.documentElement;
  try {
    var THEME_KEY = ${JSON.stringify(STORAGE_KEY)};
    var LEGACY_THEME_KEY = ${JSON.stringify(LEGACY_STORAGE_KEY)};
    var THEME_DEFAULT = ${JSON.stringify(DEFAULT_THEME)};
    var THEMES = ${JSON.stringify(THEME_IDS)};
    var savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === null) {
      // One-time silent migration from the pre-rebrand key — a
      // returning visitor keeps their chosen accent instead of
      // snapping back to the new default.
      var legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
      if (legacyTheme !== null) {
        savedTheme = legacyTheme;
        localStorage.setItem(THEME_KEY, legacyTheme);
        localStorage.removeItem(LEGACY_THEME_KEY);
      }
    }
    d.dataset.theme = THEMES.indexOf(savedTheme) !== -1 ? savedTheme : THEME_DEFAULT;

    var MODE_KEY = ${JSON.stringify(MODE_STORAGE_KEY)};
    var LEGACY_MODE_KEY = ${JSON.stringify(LEGACY_MODE_STORAGE_KEY)};
    var MODE_DEFAULT = ${JSON.stringify(DEFAULT_MODE)};
    var MODES = ${JSON.stringify(MODES)};
    var savedMode = localStorage.getItem(MODE_KEY);
    if (savedMode === null) {
      var legacyMode = localStorage.getItem(LEGACY_MODE_KEY);
      if (legacyMode !== null) {
        savedMode = legacyMode;
        localStorage.setItem(MODE_KEY, legacyMode);
        localStorage.removeItem(LEGACY_MODE_KEY);
      }
    }
    d.dataset.mode = MODES.indexOf(savedMode) !== -1 ? savedMode : MODE_DEFAULT;
  } catch (_e) {
    d.dataset.theme = ${JSON.stringify(DEFAULT_THEME)};
    d.dataset.mode = ${JSON.stringify(DEFAULT_MODE)};
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      data-mode={DEFAULT_MODE}
      className={`${inter.variable} ${interTight.variable} h-full antialiased`}
      // The `theme-boot` script below rewrites `data-theme` and
      // `data-mode` on <html> from localStorage before React hydrates,
      // so for any non-default choice the client DOM intentionally
      // differs from the server-rendered defaults. suppressHydration-
      // Warning silences the expected mismatch — it only applies to
      // this element's own attributes, so genuine mismatches in
      // children still surface.
      suppressHydrationWarning
    >
      <head>
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground font-sans">
        <ThemeProvider>
          {children}
          <ThemedToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
