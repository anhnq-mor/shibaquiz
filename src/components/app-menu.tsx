"use client";

import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu as MenuIcon } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export interface AppMenuItem {
  href: Route;
  label: string;
  icon: ReactNode;
}

export function AppMenu({
  triggerLabel,
  triggerAriaLabel,
  items,
}: {
  triggerLabel: string;
  triggerAriaLabel: string;
  items: AppMenuItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="app-menu" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="app-menu-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={triggerAriaLabel}
        onClick={() => setOpen((current) => !current)}
      >
        <MenuIcon size={16} aria-hidden />
        <span>{triggerLabel}</span>
        <ChevronDown size={14} aria-hidden />
      </button>

      {open && (
        <nav
          className="app-menu-panel"
          id={panelId}
          aria-label={triggerAriaLabel}
        >
          {items.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
