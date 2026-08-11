"use client";

import type { Route } from "next";
import { RouteLink as Link } from "@/components/route-link";
import { usePathname } from "next/navigation";
import {
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

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
  const links: Array<{
    href: Route;
    label: string;
    icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  }> = [
    {
      href: `/${locale}/admin` as Route,
      label: messages.nav.dashboard,
      icon: LayoutDashboard,
    },
    {
      href: `/${locale}/admin/exams` as Route,
      label: messages.nav.exams,
      icon: GraduationCap,
    },
    {
      href: `/${locale}/admin/topics` as Route,
      label: messages.nav.topics,
      icon: Layers,
    },
    {
      href: `/${locale}/admin/questions` as Route,
      label: messages.nav.questions,
      icon: ListChecks,
    },
    {
      href: `/${locale}/admin/tests` as Route,
      label: messages.nav.tests,
      icon: FileText,
    },
    {
      href: `/${locale}/admin/media` as Route,
      label: messages.nav.media,
      icon: ImageIcon,
    },
    {
      href: `/${locale}/admin/import` as Route,
      label: messages.nav.imports,
      icon: Upload,
    },
    {
      href: `/${locale}/admin/users` as Route,
      label: messages.nav.users,
      icon: Users,
    },
    {
      href: `/${locale}/admin/audit` as Route,
      label: messages.nav.audit,
      icon: ShieldCheck,
    },
  ];

  return (
    <nav className="admin-nav" aria-label={messages.dashboard.title}>
      {links.map((link) => {
        const isDashboard = link.href === `/${locale}/admin`;
        const isActive = isDashboard
          ? pathname === link.href
          : pathname.startsWith(link.href);
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
