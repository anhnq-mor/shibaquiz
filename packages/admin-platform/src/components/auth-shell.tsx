import type { Route } from "next";
import NextLink from "next/link";
import type { ComponentProps, ComponentType, ReactNode } from "react";

import type { Locale } from "../domain/auth";

export interface AuthShellMessages {
  common: {
    home: string;
  };
}

export function AuthShell({
  locale,
  messages,
  title,
  description,
  children,
  brandHref,
  brandLabel,
  brandIcon,
  localeSwitcher,
  LinkComponent = NextLink,
}: {
  locale: Locale;
  messages: AuthShellMessages;
  title: string;
  description: string;
  children: ReactNode;
  brandHref: string;
  brandLabel: string;
  brandIcon?: ReactNode;
  localeSwitcher?: ReactNode;
  LinkComponent?: ComponentType<ComponentProps<typeof NextLink>>;
}) {
  return (
    <main className="auth-page">
      {localeSwitcher}
      <section className="auth-card" aria-labelledby="auth-title">
        <LinkComponent href={brandHref as Route} className="auth-brand">
          {brandIcon}
          <span>{brandLabel}</span>
        </LinkComponent>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-description">{description}</p>
        {children}
        <LinkComponent href={`/${locale}` as Route} className="auth-home-link">
          {messages.common.home}
        </LinkComponent>
      </section>
    </main>
  );
}
