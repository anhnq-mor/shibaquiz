"use client";

import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { usePathname } from "next/navigation";
import { BookOpen, History, User } from "lucide-react";
import type { ComponentType } from "react";

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
  const links: Array<{
    href: Route;
    label: string;
    icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  }> = [
    {
      href: `/${locale}/exams` as Route,
      label: messages.nav.exams,
      icon: BookOpen,
    },
    {
      href: `/${locale}/history` as Route,
      label: messages.nav.history,
      icon: History,
    },
    {
      href: `/${locale}/account` as Route,
      label: messages.nav.account,
      icon: User,
    },
  ];

  return (
    <nav className="app-nav" aria-label={messages.nav.exams}>
      {links.map((link) => {
        const isActive = pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={16} aria-hidden />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
