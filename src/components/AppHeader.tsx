"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { usePreferences } from "@/lib/preferences";
import { BackIcon, CloseIcon, HomeIcon, InfoIcon, MenuIcon, PuzzleIcon } from "./icons";
import styles from "./AppHeader.module.css";

const NAV_ITEMS = [
  { href: "/", key: "home", Icon: HomeIcon },
  { href: "/quiz", key: "quiz", Icon: PuzzleIcon },
  { href: "/about", key: "about", Icon: InfoIcon },
] as const;

export function AppHeader({ title, showBack = false }: { title?: string; showBack?: boolean }) {
  const { t } = usePreferences();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={styles.start}>
        {showBack && (
          <Link href="/" className={styles.iconButton} aria-label={t.common.backHome}>
            <BackIcon className={styles.flipInRtl} />
          </Link>
        )}
      </div>

      {title ? <p className={styles.title}>{title}</p> : <span />}

      <div className={styles.end} ref={containerRef}>
        <button
          ref={buttonRef}
          type="button"
          className={styles.iconButton}
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? t.common.menuClose : t.common.menuOpen}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>

        <nav id={menuId} className={styles.menu} aria-label={t.common.navLabel} hidden={!open}>
          <ul className={styles.menuList}>
            {NAV_ITEMS.map(({ href, key, Icon }) => {
              const current = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={styles.menuLink}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={22} />
                    <span>{t.common.nav[key]}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
