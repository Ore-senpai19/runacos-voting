import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { withAutoEnd } from "@/lib/elections";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await prisma.election.findUnique({ where: { id: params.id } });
  if (!raw) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const election = await withAutoEnd(raw);

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
    election: {
      id: election.id,
      title: election.title,
      status: election.status,
      endTime: election.endTime,
    },
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
