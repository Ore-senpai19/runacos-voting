import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const election = await prisma.election.findUnique({ where: { id: params.id } });
  if (!election) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const votes = await prisma.vote.findMany({
    where: { electionId: params.id },
    include: {
      student: { select: { firstName: true, surname: true, email: true, matricNumber: true } },
      position: { select: { title: true, order: true } },
      candidate: { select: { name: true } },
    },
    orderBy: [{ studentId: "asc" }, { position: { order: "asc" } }],
  });

  const byStudent = new Map<
    string,
    {
      student: { firstName: string; surname: string; email: string; matricNumber: string };
      picks: { position: string; candidate: string }[];
      votedAt: Date;
    }
  >();

  for (const v of votes) {
    const existing = byStudent.get(v.studentId);
    if (existing) {
      existing.picks.push({ position: v.position.title, candidate: v.candidate.name });
    } else {
      byStudent.set(v.studentId, {
        student: v.student,
        picks: [{ position: v.position.title, candidate: v.candidate.name }],
        votedAt: v.createdAt,
      });
    }
  }

  return NextResponse.json({
    election: { id: election.id, title: election.title },
    voters: Array.from(byStudent.values()).sort(
      (a, b) => a.student.surname.localeCompare(b.student.surname)
    ),
  });
}
