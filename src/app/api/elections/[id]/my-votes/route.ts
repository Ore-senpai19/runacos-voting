import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const votes = await prisma.vote.findMany({
    where: { electionId: params.id, studentId: session.sub },
    include: { position: true, candidate: true },
    orderBy: { position: { order: "asc" } },
  });

  if (votes.length === 0) {
    return NextResponse.json({ error: "You have not voted in this election" }, { status: 404 });
  }

  return NextResponse.json({
    votes: votes.map((v) => ({
      position: v.position.title,
      candidate: v.candidate.name,
      candidatePhoto: v.candidate.photoUrl,
      castAt: v.createdAt,
    })),
  });
}
