import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { MAX_ELECTION_MINUTES } from "@/lib/validators";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const election = await prisma.election.findUnique({
    where: { id: params.id },
    include: {
      positions: { orderBy: { order: "asc" }, include: { candidates: { orderBy: { order: "asc" } } } },
      _count: { select: { votes: true, accesses: true } },
    },
  });
  if (!election) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ election });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const action = body?.action;

  const election = await prisma.election.findUnique({
    where: { id: params.id },
    include: { positions: { include: { candidates: true } } },
  });
  if (!election) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "go-live") {
    if (election.status !== "DRAFT") {
      return NextResponse.json({ error: "Election already started" }, { status: 400 });
    }
    if (election.positions.length === 0) {
      return NextResponse.json({ error: "Add at least one position first" }, { status: 400 });
    }
    for (const p of election.positions) {
      if (p.candidates.length < 2) {
        return NextResponse.json(
          { error: `Position "${p.title}" needs at least 2 candidates` },
          { status: 400 }
        );
      }
    }
    if (election.durationMinutes > MAX_ELECTION_MINUTES) {
      return NextResponse.json({ error: "Duration exceeds 2 hour limit" }, { status: 400 });
    }
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + election.durationMinutes * 60 * 1000);
    const updated = await prisma.election.update({
      where: { id: election.id },
      data: { status: "LIVE", startTime, endTime },
    });
    return NextResponse.json({ election: updated });
  }

  if (action === "end") {
    if (election.status !== "LIVE") {
      return NextResponse.json({ error: "Election is not live" }, { status: 400 });
    }
    const updated = await prisma.election.update({
      where: { id: election.id },
      data: { status: "ENDED", endTime: new Date() },
    });
    return NextResponse.json({ election: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
