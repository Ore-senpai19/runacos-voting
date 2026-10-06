import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withAutoEnd } from "@/lib/elections";
import { StatusStamp } from "@/components/StatusStamp";
import { LogoutButton } from "@/components/LogoutButton";
import { PageHeader } from "@/components/PageHeader";

export default async function DashboardPage() {
  const session = await getStudentSession();
  if (!session) redirect("/");

  const student = await prisma.student.findUnique({ where: { id: session.sub } });
  if (!student) redirect("/");

  const elections = await prisma.election.findMany({
    where: { status: { in: ["LIVE", "ENDED"] } },
    orderBy: { createdAt: "desc" },
  });
  const resolved = await Promise.all(elections.map(withAutoEnd));

  const votes = await prisma.vote.findMany({
    where: { studentId: student.id },
    select: { electionId: true },
    distinct: ["electionId"],
  });
  const votedIds = new Set(votes.map((v) => v.electionId));
  const displayName = student.firstName.charAt(0).toUpperCase() + student.firstName.slice(1).toLowerCase();

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <PageHeader
        title={`Welcome, ${displayName}`}
        subtitle={
          <>
            {student.email} · <span className="font-mono">{student.matricNumber}</span> ·{" "}
            {student.department}
          </>
        }
        actions={<LogoutButton scope="student" />}
      />

      {resolved.length === 0 ? (
        <div className="card text-center text-sm text-ink-soft">
          No elections are open right now. Check back once your association announces one.
        </div>
      ) : (
        <ul className="space-y-4">
          {resolved.map((e) => (
            <li key={e.id} className="card-interactive flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{e.title}</h2>
                <div className="mt-2 flex items-center gap-3">
                  <StatusStamp status={e.status} />
                  {votedIds.has(e.id) && (
                    <span className="text-xs font-medium text-confirm">✓ You voted</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {e.status === "LIVE" && !votedIds.has(e.id) && (
                  <Link href={`/election/${e.id}`} className="btn-primary">
                    Vote now
                  </Link>
                )}
                {e.status === "LIVE" && votedIds.has(e.id) && (
                  <Link href={`/election/${e.id}/review`} className="btn-secondary">
                    Review my votes
                  </Link>
                )}
                {e.status === "ENDED" && votedIds.has(e.id) && (
                  <Link href={`/election/${e.id}/review`} className="btn-secondary">
                    My votes
                  </Link>
                )}
                {e.status === "ENDED" && (
                  <Link href={`/election/${e.id}/results`} className="btn-gold">
                    Results
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
