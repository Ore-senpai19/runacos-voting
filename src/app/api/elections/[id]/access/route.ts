import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";
import { accessElectionSchema } from "@/lib/validators";
import { getElectionAutoEnded } from "@/lib/elections";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const election = await getElectionAutoEnded(params.id);
  if (!election) return NextResponse.json({ error: "Election not found" }, { status: 404 });
  if (election.status !== "LIVE") {
    return NextResponse.json({ error: "This election is not currently open for voting" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = accessElectionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Password is required" }, { status: 400 });

  const ok = await bcrypt.compare(parsed.data.password, election.passwordHash);
  if (!ok) return NextResponse.json({ error: "Incorrect election password" }, { status: 401 });

  await prisma.electionAccess.upsert({
    where: { electionId_studentId: { electionId: election.id, studentId: session.sub } },
    update: {},
    create: { electionId: election.id, studentId: session.sub },
  });

  return NextResponse.json({ ok: true });
}
