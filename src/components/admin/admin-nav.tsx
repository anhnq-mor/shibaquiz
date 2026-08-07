"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Locale } from "@/domain/common/locale";
import type { AdminCatalog } from "@/i18n/admin-catalogs";

export function AdminNav({
  locale,
  messages,
}: {
  locale: Locale;
  messages: AdminCatalog;
}) {
  const pathname = usePathname();
  const links: Array<{ href: Route; label: string }> = [
    { href: `/${locale}/admin` as Route, label: messages.nav.dashboard },
    { href: `/${locale}/admin/exams` as Route, label: messages.nav.exams },
    { href: `/${locale}/admin/topics` as Route, label: messages.nav.topics },
    {
      href: `/${locale}/admin/questions` as Route,
      label: messages.nav.questions,
    },
    { href: `/${locale}/admin/tests` as Route, label: messages.nav.tests },
  ];

  return (
    <nav className="admin-nav" aria-label={messages.dashboard.title}>
      {links.map((link) => {
        const isDashboard = link.href === `/${locale}/admin`;
        const isActive = isDashboard
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
