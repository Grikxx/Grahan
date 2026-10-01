"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/tutorial", label: "Learn" },
  { href: "/about", label: "Rules" },
  { href: "/play", label: "Play" },
];

export default function SiteNav() {
  const path = usePathname();
  return (
    <header className="site-nav">
      <Link href="/" className="wordmark" aria-label="Grahan home">
        <span className="display">Grahan</span>
        <span className="deva" aria-hidden="true">ग्रहण</span>
      </Link>
      <nav className="nav-links" aria-label="Main">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="nav-link" aria-current={path === l.href ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
