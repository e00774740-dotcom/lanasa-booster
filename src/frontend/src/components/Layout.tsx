import type { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-center px-4 py-4">
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
            LaNasa<span aria-hidden="true">🥷🏻</span>{" "}
            <span className="text-gradient-plasma">Booster</span>
          </h1>
        </div>
      </header>

      <main className="starfield relative flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
          {children}
        </div>
      </main>

      <footer className="border-t border-border bg-muted/40">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-1 px-4 py-4 text-center text-xs text-muted-foreground">
          <p className="font-mono uppercase tracking-widest">
            Consola de propulsión · v1.0
          </p>
          <p>
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
