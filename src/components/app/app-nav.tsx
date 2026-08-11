"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Locale } from "@/domain/common/locale";
import type { QuizCatalog } from "@/i18n/quiz-catalogs";

export function AppNav({
  locale,
  messages,
}: {
  locale: Locale;
  messages: QuizCatalog;
}) {
  const pathname = usePathname();
  const links: Array<{ href: Route; label: string }> = [
    { href: `/${locale}/exams` as Route, label: messages.nav.exams },
    { href: `/${locale}/history` as Route, label: messages.nav.history },
    { href: `/${locale}/account` as Route, label: messages.nav.account },
  ];

  return (
    <nav className="app-nav" aria-label={messages.nav.exams}>
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href);
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
