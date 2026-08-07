import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { isLocale } from "@/domain/common/locale";
import { getMessages } from "@/i18n/catalogs";

const principleIcons = ["01", "02", "03"] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const messages = getMessages(locale);
  const principles = [
    [messages.principles.databaseTitle, messages.principles.databaseBody],
    [messages.principles.mediaTitle, messages.principles.mediaBody],
    [messages.principles.privacyTitle, messages.principles.privacyBody],
  ] as const;

  return (
    <>
      <a className="skip-link" href="#main-content">
        {messages.a11y.skipToContent}
      </a>
      <SiteHeader locale={locale} messages={messages} />
      <main id="main-content">
        <section className="hero page-shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">{messages.hero.eyebrow}</p>
            <h1 id="hero-title">{messages.hero.title}</h1>
            <p className="hero-description">{messages.hero.description}</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#principles">
                {messages.hero.primaryAction}
              </a>
              <a className="button button-secondary" href="#status">
                {messages.hero.secondaryAction}
              </a>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="quiz-card">
              <span className="quiz-card-kicker">ShibaQuiz</span>
              <span className="quiz-card-line quiz-card-line-wide" />
              <span className="quiz-card-line" />
              <span className="quiz-card-option active" />
              <span className="quiz-card-option" />
              <span className="quiz-card-option" />
            </div>
          </div>
        </section>

        <section
          className="principles"
          id="principles"
          aria-labelledby="principles-heading"
        >
          <div className="page-shell">
            <div className="section-heading">
              <h2 id="principles-heading">{messages.principles.heading}</h2>
              <p>{messages.principles.description}</p>
            </div>
            <div className="principle-grid">
              {principles.map(([title, body], index) => (
                <article className="principle-card" key={title}>
                  <span className="principle-number" aria-hidden="true">
                    {principleIcons[index]}
                  </span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="delivery page-shell"
          id="status"
          aria-labelledby="status-heading"
        >
          <div className="section-heading">
            <h2 id="status-heading">{messages.status.heading}</h2>
            <p>{messages.status.description}</p>
          </div>
          <ol className="delivery-list">
            <li>
              <span className="delivery-marker" aria-hidden="true" />
              <strong>{messages.status.foundation}</strong>
              <span className="status-pill">
                {messages.status.foundationState}
              </span>
            </li>
            <li>
              <span className="delivery-marker" aria-hidden="true" />
              <strong>{messages.status.next}</strong>
              <span className="status-pill">{messages.status.nextState}</span>
            </li>
            <li className="current">
              <span className="delivery-marker" aria-hidden="true" />
              <strong>{messages.status.localization}</strong>
              <span className="status-pill">
                {messages.status.localizationState}
              </span>
            </li>
          </ol>
        </section>
      </main>
      <footer className="site-footer">
        <div className="page-shell">
          <p>{messages.footer}</p>
          <Link href={`/${locale}` as Route}>ShibaQuiz</Link>
        </div>
      </footer>
    </>
  );
}
