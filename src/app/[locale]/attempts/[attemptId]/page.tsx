import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { AttemptRunner } from "@/components/app/attempt-runner";
import { isAttemptError } from "@/domain/attempts/attempt";
import { isLocale } from "@/domain/common/locale";
import { getQuizMessages } from "@/i18n/quiz-catalogs";
import { getCurrentUser } from "@/server/auth/authorization";
import { getAttemptService } from "@/server/content/runtime";

export const dynamic = "force-dynamic";

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ locale: string; attemptId: string }>;
}) {
  const { locale, attemptId } = await params;
  if (!isLocale(locale)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login` as Route);

  const messages = getQuizMessages(locale);

  let attempt;
  try {
    attempt = await getAttemptService().getAttemptForTaking(attemptId, user.id);
  } catch (error) {
    if (isAttemptError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  if (attempt.status !== "IN_PROGRESS") {
    redirect(`/${locale}/attempts/${attemptId}/result` as Route);
  }

  return (
    <AppShell locale={locale} user={user}>
      <AttemptRunner locale={locale} messages={messages} initial={attempt} />
    </AppShell>
  );
}
