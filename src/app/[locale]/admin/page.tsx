import { notFound } from "next/navigation";

import { isLocale } from "@/domain/common/locale";
import { getAdminMessages } from "@/i18n/admin-catalogs";
import { getAdminContentService } from "@/server/content/runtime";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getAdminMessages(locale);
  const workspace = await getAdminContentService().getWorkspace();

  const stats = [
    {
      label: messages.dashboard.exams,
      value: workspace.exams.length,
      detail: `${workspace.exams.filter((exam) => exam.status === "PUBLISHED").length} ${messages.dashboard.published}`,
    },
    { label: messages.dashboard.topics, value: workspace.topics.length },
    { label: messages.dashboard.questions, value: workspace.questions.length },
    { label: messages.dashboard.tests, value: workspace.tests.length },
  ];

  return (
    <>
      <div className="admin-page-header">
        <h1>{messages.dashboard.title}</h1>
        <p>{messages.dashboard.description}</p>
      </div>
      <dl className="admin-dashboard-grid">
        {stats.map((stat) => (
          <div className="admin-stat-card" key={stat.label}>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
            {stat.detail && <p className="admin-hint">{stat.detail}</p>}
          </div>
        ))}
      </dl>
    </>
  );
}
