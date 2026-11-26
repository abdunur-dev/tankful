import Link from "next/link";

export function LogoMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M4 7.5 7.5 4H13v3h-2.5L9 8.5V9h11v11H4V7.5Z" />
      <path d="M15 4h4v3h-4z" />
      <path d="M6 15h12v3H6z" fill="#000" fillOpacity="0.55" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 text-sm font-medium tracking-[0.08em] text-ink ${className}`}>
      <LogoMark />
      TANKFUL.
    </Link>
  );
}
