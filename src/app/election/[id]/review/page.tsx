import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ReviewPage({ params }: { params: { id: string } }) {
  const session = await getStudentSession();
  if (!session) redirect("/");

  const election = await prisma.election.findUnique({ where: { id: params.id } });
  if (!election) redirect("/dashboard");

  const votes = await prisma.vote.findMany({
    where: { electionId: params.id, studentId: session.sub },
    include: { position: true, candidate: true },
    orderBy: { position: { order: "asc" } },
  });

  if (votes.length === 0) redirect(`/election/${params.id}`);

  return (
    <main className="mx-auto min-h-screen max-w-xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-dark">Ballot receipt</p>
      <h1 className="mt-1 mb-1 text-2xl font-semibold italic">{election.title}</h1>
      <p className="mb-8 text-sm text-ink-soft">
        This is a read-only record of your submission. Votes cannot be changed once cast.
      </p>

      <ul className="space-y-3">
        {votes.map((v) => (
          <li key={v.id} className="card flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={v.candidate.photoUrl}
              alt={v.candidate.name}
              className="h-14 w-14 rounded-full object-cover"
            />
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-soft">{v.position.title}</p>
              <p className="font-medium">{v.candidate.name}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex gap-3">
        <Link href="/dashboard" className="btn-secondary">
          Back to elections
        </Link>
        {election.status === "ENDED" && (
          <Link href={`/election/${params.id}/results`} className="btn-gold">
            View results
          </Link>
        )}
      </div>
    </main>
  );
}
