import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { WinnerStamp } from "@/components/WinnerStamp";

export default async function AdminResultsPage({ params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const election = await prisma.election.findUnique({ where: { id: params.id } });
  if (!election) redirect("/admin");
  if (election.status !== "ENDED") redirect(`/admin/elections/${params.id}`);

  const positions = await prisma.position.findMany({
    where: { electionId: election.id },
    orderBy: { order: "asc" },
    include: { candidates: { include: { _count: { select: { votes: true } } } } },
  });

  const totalVoters = await prisma.vote
    .findMany({ where: { electionId: election.id }, distinct: ["studentId"] })
    .then((v) => v.length);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <Link href="/admin" className="text-xs text-ink-soft underline">
        ← All elections
      </Link>

      <div className="mt-3 mb-2 flex items-center justify-between">
        <div className="stamp-ended w-fit">Final Results</div>
        <div className="flex gap-2">
          <a href={`/api/elections/${election.id}/results/export`} download className="btn-secondary text-xs">
            Download .xlsx
          </a>
          <CopyLinkButton path={`/election/${election.id}/results`} />
        </div>
      </div>
      <h1 className="mb-1 text-2xl font-semibold italic">{election.title}</h1>
      <p className="mb-8 text-sm text-ink-soft">
        {totalVoters} student{totalVoters === 1 ? "" : "s"} voted. These totals are read directly from
        submitted ballots and cannot be edited from this or any admin screen.
      </p>

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
    </main>
  );
}
