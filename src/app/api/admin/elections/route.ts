import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { createElectionSchema } from "@/lib/validators";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const elections = await prisma.election.findMany({
    orderBy: { createdAt: "desc" },
    include: { positions: { include: { candidates: true } }, _count: { select: { votes: true } } },
  });

  return NextResponse.json({ elections });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createElectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const { title, durationMinutes, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const election = await prisma.election.create({
    data: { title, durationMinutes, passwordHash, createdById: admin.sub },
  });

  return NextResponse.json({ election }, { status: 201 });
}
