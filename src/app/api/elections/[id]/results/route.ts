import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudentSession, getAdminSession } from "@/lib/auth";
import { getElectionAutoEnded } from "@/lib/elections";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const student = await getStudentSession();
  const admin = await getAdminSession();
  if (!student && !admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const election = await getElectionAutoEnded(params.id);
  if (!election) return NextResponse.json({ error: "Election not found" }, { status: 404 });
  if (election.status !== "ENDED") {
    return NextResponse.json({ error: "Results are available once the election ends" }, { status: 400 });
  }

  const positions = await prisma.position.findMany({
    where: { electionId: election.id },
    orderBy: { order: "asc" },
    include: {
      candidates: {
        orderBy: { order: "asc" },
        include: { _count: { select: { votes: true } } },
      },
    },
  });

  const totalVoters = await prisma.vote
    .findMany({ where: { electionId: election.id }, distinct: ["studentId"] })
    .then((v) => v.length);

  return NextResponse.json({
    election: { id: election.id, title: election.title, endTime: election.endTime },
    totalVoters,
    positions: positions.map((p) => ({
      id: p.id,
      title: p.title,
      candidates: p.candidates
        .map((c) => ({ id: c.id, name: c.name, photoUrl: c.photoUrl, votes: c._count.votes }))
        .sort((a, b) => b.votes - a.votes),
    })),
  });
}
