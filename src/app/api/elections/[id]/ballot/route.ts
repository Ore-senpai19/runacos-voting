import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";
import { getElectionAutoEnded } from "@/lib/elections";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const election = await getElectionAutoEnded(params.id);
  if (!election) return NextResponse.json({ error: "Election not found" }, { status: 404 });
  if (election.status !== "LIVE") {
    return NextResponse.json({ error: "This election is not currently open for voting" }, { status: 400 });
  }

  const access = await prisma.electionAccess.findUnique({
    where: { electionId_studentId: { electionId: election.id, studentId: session.sub } },
  });
  if (!access) {
    return NextResponse.json({ error: "Enter the election password first" }, { status: 403 });
  }

  const existingVote = await prisma.vote.findFirst({
    where: { electionId: election.id, studentId: session.sub },
  });
  if (existingVote) {
    return NextResponse.json({ error: "You have already voted in this election" }, { status: 409 });
  }

  const positions = await prisma.position.findMany({
    where: { electionId: election.id },
    orderBy: { order: "asc" },
    include: {
      candidates: {
        orderBy: { order: "asc" },
        select: { id: true, name: true, photoUrl: true, bio: true },
      },
    },
  });

  return NextResponse.json({
    election: { id: election.id, title: election.title, endTime: election.endTime },
    positions,
  });
}
