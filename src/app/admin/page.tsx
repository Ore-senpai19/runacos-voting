import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withAutoEnd } from "@/lib/elections";
import { StatusStamp } from "@/components/StatusStamp";
import { LogoutButton } from "@/components/LogoutButton";
import { PageHeader } from "@/components/PageHeader";

export default async function AdminDashboard() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const elections = await prisma.election.findMany({ orderBy: { createdAt: "desc" } });
  const resolved = await Promise.all(elections.map(withAutoEnd));

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <PageHeader
        title="Election Admin"
        subtitle={admin.email}
        actions={
          <>
            <Link href="/admin/elections/new" className="btn-primary">
              + New election
            </Link>
            <LogoutButton scope="admin" />
          </>
        }
      />

      {resolved.length === 0 ? (
        <div className="card text-center text-sm text-ink-soft">
          No elections yet. Create your first one.
        </div>
      ) : (
        <ul className="space-y-4">
          {resolved.map((e) => (
            <li key={e.id} className="card-interactive flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{e.title}</h2>
                <div className="mt-2">
                  <StatusStamp status={e.status} />
                </div>
              </div>
              <Link href={`/admin/elections/${e.id}`} className="btn-secondary shrink-0">
                Manage
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
