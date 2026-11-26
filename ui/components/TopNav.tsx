"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";
import { LogoMark } from "./Logo";

export function TopNav() {
  const path = usePathname();
  return <header className="site-nav">
    <Link href="/" className="wordmark" aria-label="Tankful home"><LogoMark className="size-6" />tankful</Link>
    <nav aria-label="Main">
      <Link href="/" aria-current={path === "/" ? "page" : undefined}>Home</Link>
      {path === "/" ? <a href="#features">Features</a> : <Link href="/#features">Features</Link>}
      <Link href="/docs" aria-current={path.startsWith("/docs") ? "page" : undefined}>Docs</Link>
      <a href={site.npm}>npm ↗</a>
      <a className="mobile-repo" href={site.github}>GitHub</a>
    </nav>
    <div className="nav-actions">
      <a href={site.github}>GitHub</a>
      <button type="button" className="theme-toggle" onClick={() => {
        const root = document.documentElement;
        const theme = root.dataset.theme === "dark" ? "light" : "dark";
        root.dataset.theme = theme;
        try { localStorage.setItem("tankful-theme", theme); } catch { /* Still applies for this visit. */ }
      }}>
        <span className="to-dark"><span aria-hidden="true">☾</span><span className="sr-only">Switch to dark theme</span></span>
        <span className="to-light"><span aria-hidden="true">☀</span><span className="sr-only">Switch to light theme</span></span>
      </button>
      <Link href="/docs/installation" className="nav-cta">Get started</Link>
    </div>
  </header>;
}
