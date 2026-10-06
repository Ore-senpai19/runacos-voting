import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";
import { getElectionAutoEnded } from "@/lib/elections";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const election = await getElectionAutoEnded(params.id);
  if (!election) return NextResponse.json({ error: "Election not found" }, { status: 404 });

  const access = await prisma.electionAccess.findUnique({
    where: { electionId_studentId: { electionId: election.id, studentId: session.sub } },
  });
  const hasVoted = await prisma.vote.findFirst({
    where: { electionId: election.id, studentId: session.sub },
  });

  return NextResponse.json({
    election: {
      id: election.id,
      title: election.title,
      status: election.status,
      startTime: election.startTime,
      endTime: election.endTime,
    },
    hasAccess: Boolean(access),
    hasVoted: Boolean(hasVoted),
  });
}
