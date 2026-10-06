import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withAutoEnd } from "@/lib/elections";
import { WinnerStamp } from "@/components/WinnerStamp";

export default async function ResultsPage({ params }: { params: { id: string } }) {
  const session = await getStudentSession();
  if (!session) redirect("/");

  const raw = await prisma.election.findUnique({ where: { id: params.id } });
  if (!raw) redirect("/dashboard");
  const election = await withAutoEnd(raw);

  if (election.status !== "ENDED") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-ink-soft">
        Results will be available once voting closes.
      </main>
    );
  }

  const positions = await prisma.position.findMany({
    where: { electionId: election.id },
    orderBy: { order: "asc" },
    include: { candidates: { include: { _count: { select: { votes: true } } } } },
  });

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <div className="mb-4 flex items-center justify-between">
        <div className="stamp-ended w-fit">Final Results</div>
        <a href={`/api/elections/${election.id}/results/export`} download className="btn-secondary text-xs">
          Download .xlsx
        </a>
      </div>
      <h1 className="mb-8 text-2xl font-semibold italic">{election.title}</h1>

      <div className="space-y-8">
        {positions.map((position) => {
          const sorted = [...position.candidates].sort((a, b) => b._count.votes - a._count.votes);
          const total = sorted.reduce((sum, c) => sum + c._count.votes, 0);
          const winnerVotes = sorted[0]?._count.votes ?? 0;
          return (
            <section key={position.id}>
              <h2 className="mb-3 text-lg font-semibold">{position.title}</h2>
              <div className="space-y-2">
                {sorted.map((c) => {
                  const pct = total > 0 ? Math.round((c._count.votes / total) * 100) : 0;
                  const isWinner = c._count.votes === winnerVotes && total > 0;
                  return (
                    <div key={c.id} className="card">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {c.name} {isWinner && <WinnerStamp />}
                        </span>
                        <span className="font-mono text-ink-soft">
                          {c._count.votes} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-sm bg-line">
                        <div
                          className={`h-2 rounded-sm ${isWinner ? "bg-gold" : "bg-ink-soft"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <Link href="/dashboard" className="btn-secondary mt-10 inline-flex">
        Back to elections
      </Link>
    </main>
  );
}
