"use client";

import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { useEffect, useId, useRef, useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import type { AuthenticatedUserDto } from "@/domain/auth/auth";
import type { Locale } from "@/domain/common/locale";
import type { MessageCatalog } from "@/i18n/catalogs";

export function AccountMenu({
  locale,
  messages,
  user,
}: {
  locale: Locale;
  messages: MessageCatalog;
  user: AuthenticatedUserDto;
}) {
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
    <div className="account-menu" ref={containerRef}>
      <button
        ref={triggerRef}
        className="avatar-button"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={messages.navigation.userMenu}
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12.1a4.3 4.3 0 1 0 0-8.6 4.3 4.3 0 0 0 0 8.6Zm0 2.1c-4.7 0-8.5 2.4-8.5 5.4 0 .5.4.9.9.9h15.2c.5 0 .9-.4.9-.9 0-3-3.8-5.4-8.5-5.4Z" />
        </svg>
      </button>

      {open && (
        <div className="account-menu-panel" id={panelId}>
          <div className="account-menu-identity">
            <span>{messages.navigation.signedInAs}</span>
            <strong>{user.displayName}</strong>
            <small>{user.email}</small>
          </div>
          <nav aria-label={messages.navigation.userMenu}>
            <Link href={`/${locale}/account` as Route}>
              {messages.navigation.account}
            </Link>
          </nav>
          <LogoutButton
            className="account-menu-logout"
            locale={locale}
            label={messages.navigation.logout}
            working={messages.a11y.apiLoading}
          />
        </div>
      )}
    </div>
  );
}
