import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";
import { submitVotesSchema } from "@/lib/validators";
import { getElectionAutoEnded } from "@/lib/elections";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const election = await getElectionAutoEnded(params.id);
  if (!election) return NextResponse.json({ error: "Election not found" }, { status: 404 });
  if (election.status !== "LIVE") {
    return NextResponse.json({ error: "Voting has closed for this election" }, { status: 400 });
  }

  const access = await prisma.electionAccess.findUnique({
    where: { electionId_studentId: { electionId: election.id, studentId: session.sub } },
  });
  if (!access) {
    return NextResponse.json({ error: "Enter the election password first" }, { status: 403 });
  }

  const alreadyVoted = await prisma.vote.findFirst({
    where: { electionId: election.id, studentId: session.sub },
  });
  if (alreadyVoted) {
    return NextResponse.json({ error: "You have already voted in this election" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const parsed = submitVotesSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid ballot" }, { status: 400 });

  const positions = await prisma.position.findMany({
    where: { electionId: election.id },
    include: { candidates: true },
  });

  // Every position must have exactly one selection, and it must be a valid
  // candidate for that position -- reject partial or tampered ballots.
  if (parsed.data.selections.length !== positions.length) {
    return NextResponse.json({ error: "You must vote for every position" }, { status: 400 });
  }
  const seenPositions = new Set<string>();
  for (const sel of parsed.data.selections) {
    const position = positions.find((p) => p.id === sel.positionId);
    if (!position) return NextResponse.json({ error: "Unknown position in ballot" }, { status: 400 });
    if (seenPositions.has(position.id)) {
      return NextResponse.json({ error: "Duplicate vote for one position" }, { status: 400 });
    }
    seenPositions.add(position.id);
    const validCandidate = position.candidates.some((c) => c.id === sel.candidateId);
    if (!validCandidate) {
      return NextResponse.json({ error: "Invalid candidate for a position" }, { status: 400 });
    }
  }

  try {
    await prisma.$transaction(
      parsed.data.selections.map((sel) =>
        prisma.vote.create({
          data: {
            electionId: election.id,
            positionId: sel.positionId,
            candidateId: sel.candidateId,
            studentId: session.sub,
          },
        })
      )
    );
  } catch {
    // Unique constraint hit = a duplicate submission slipped through a race
    // condition (e.g. double-click). Treat it the same as "already voted".
    return NextResponse.json({ error: "You have already voted in this election" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
