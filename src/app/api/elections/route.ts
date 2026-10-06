import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStudentSession } from "@/lib/auth";
import { withAutoEnd } from "@/lib/elections";

export async function GET() {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const elections = await prisma.election.findMany({
    where: { status: { in: ["LIVE", "ENDED"] } },
    orderBy: { createdAt: "desc" },
  });

  const resolved = await Promise.all(elections.map(withAutoEnd));

  const withMyStatus = await Promise.all(
    resolved.map(async (e) => {
      const hasVoted = await prisma.vote.findFirst({
        where: { electionId: e.id, studentId: session.sub },
      });
      return {
        id: e.id,
        title: e.title,
        status: e.status,
        startTime: e.startTime,
        endTime: e.endTime,
        durationMinutes: e.durationMinutes,
        hasVoted: Boolean(hasVoted),
      };
    })
  );

  return NextResponse.json({ elections: withMyStatus });
}
