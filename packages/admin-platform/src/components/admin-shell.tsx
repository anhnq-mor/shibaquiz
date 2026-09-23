import type { Route } from "next";
import NextLink from "next/link";
import type { ComponentProps, ComponentType, ReactNode } from "react";

export function AdminShell({
  brandHref,
  brandLabel,
  brandAriaLabel,
  brandIcon,
  nav,
  backToSiteHref,
  backToSiteLabel,
  localeSwitcher,
  children,
  LinkComponent = NextLink,
}: {
  brandHref: string;
  brandLabel: string;
  brandAriaLabel: string;
  brandIcon?: ReactNode;
  nav: ReactNode;
  backToSiteHref: string;
  backToSiteLabel: string;
  localeSwitcher?: ReactNode;
  children: ReactNode;
  LinkComponent?: ComponentType<ComponentProps<typeof NextLink>>;
}) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <LinkComponent
          href={brandHref as Route}
          className="brand admin-sidebar-brand"
          aria-label={brandAriaLabel}
        >
          {brandIcon}
          <span>{brandLabel}</span>
        </LinkComponent>
        {nav}
        <div className="admin-sidebar-footer">
          <LinkComponent href={backToSiteHref as Route}>
            {backToSiteLabel}
          </LinkComponent>
          {localeSwitcher}
        </div>
      </aside>
      <div className="admin-content">
        <main className="page-shell admin-main">{children}</main>
      </div>
    </div>
  );
}
