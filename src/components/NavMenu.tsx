"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

/** Top navigation. Inline links on wide screens; a hamburger menu with the same links (plus the section menu) on phones and tablets. */
export default function NavMenu({ links, sections, sectionLabel, who }: {
  links: [string, string][]; sections?: [string, string][]; sectionLabel?: string; who?: ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("menu-open");
    return () => { document.removeEventListener("keydown", onKey); document.body.classList.remove("menu-open"); };
  }, [open]);

  const cur = (h: string) => (path === h ? "page" : undefined);
  return (
    <>
      <nav className="nav nav-desktop" aria-label="Main">
        {links.map(([h, l]) => <Link key={h} href={h} aria-current={cur(h)}>{l}</Link>)}
      </nav>
      <button type="button" className="menu-btn" aria-expanded={open} aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
        <span className={`burger${open ? " x" : ""}`} aria-hidden="true"><i /><i /><i /></span>
      </button>
      <div id="mobile-menu" className="mobile-menu" hidden={!open}>
        {who && <div className="mm-who">{who}</div>}
        {sections && sections.length > 0 && (
          <div className="mm-group">
            <p className="eyebrow">{sectionLabel ?? "Sections"}</p>
            {sections.map(([h, l]) => <Link key={h} href={h} aria-current={cur(h)}>{l}</Link>)}
          </div>
        )}
        <div className="mm-group">
          {sections && <p className="eyebrow">Site</p>}
          {links.map(([h, l]) => <Link key={h} href={h} aria-current={cur(h)}>{l}</Link>)}
        </div>
      </div>
      {open && <button type="button" className="mm-scrim" aria-label="Close menu" tabIndex={-1} onClick={() => setOpen(false)} />}
    </>
  );
}
