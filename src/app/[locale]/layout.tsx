import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { ApiLoadingOverlay } from "@/components/api-loading-overlay";
import { isLocale, locales } from "@/domain/common/locale";
import { getMessages } from "@/i18n/catalogs";

import "../globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return {};
  }

  const messages = getMessages(locale);
  return {
    title: messages.metadata.title,
    description: messages.metadata.description,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ locale: string }> }>) {
  // A per-request render is required so Next.js can attach the CSP nonce from
  // proxy.ts to its bootstrap and page scripts.
  await connection();
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }
  const messages = getMessages(locale);

  return (
    <html lang={locale}>
      <body>
        {children}
        <ApiLoadingOverlay label={messages.a11y.apiLoading} />
      </body>
    </html>
  );
}
