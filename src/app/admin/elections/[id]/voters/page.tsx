import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function VoterLogPage({ params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const election = await prisma.election.findUnique({ where: { id: params.id } });
  if (!election) redirect("/admin");

  const votes = await prisma.vote.findMany({
    where: { electionId: params.id },
    include: {
      student: { select: { firstName: true, surname: true, email: true, matricNumber: true } },
      position: { select: { title: true, order: true } },
      candidate: { select: { name: true } },
    },
    orderBy: [{ studentId: "asc" }, { position: { order: "asc" } }],
  });

  const byStudent = new Map<
    string,
    {
      student: { firstName: string; surname: string; email: string; matricNumber: string };
      picks: { position: string; candidate: string }[];
    }
  >();

  for (const v of votes) {
    const existing = byStudent.get(v.studentId);
    if (existing) {
      existing.picks.push({ position: v.position.title, candidate: v.candidate.name });
    } else {
      byStudent.set(v.studentId, {
        student: v.student,
        picks: [{ position: v.position.title, candidate: v.candidate.name }],
      });
    }
  }

  const voters = Array.from(byStudent.values()).sort((a, b) =>
    a.student.surname.localeCompare(b.student.surname)
  );

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <Link href={`/admin/elections/${params.id}`} className="text-xs text-ink-soft underline">
        ← Back to election
      </Link>

      <h1 className="mt-3 mb-1 text-2xl font-semibold italic">{election.title}</h1>
      <p className="mb-2 text-sm text-ink-soft">
        {voters.length} student{voters.length === 1 ? "" : "s"} voted. This log is admin-only and
        exists for vote verification — it is never shown to students.
      </p>

      {voters.length === 0 ? (
        <div className="card mt-6 text-center text-sm text-ink-soft">No votes cast yet.</div>
      ) : (
        <div className="mt-6 space-y-3">
          {voters.map(({ student, picks }) => (
            <details key={student.email} className="card">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">
                      {student.firstName} {student.surname}
                    </span>
                    <span className="ml-2 font-mono text-xs text-ink-soft">{student.matricNumber}</span>
                  </div>
                  <span className="text-xs text-ink-soft">{student.email}</span>
                </div>
              </summary>
              <ul className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
                {picks.map((p, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-ink-soft">{p.position}</span>
                    <span className="font-medium">{p.candidate}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </main>
  );
}
