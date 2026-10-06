import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { addPositionSchema } from "@/lib/validators";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const election = await prisma.election.findUnique({ where: { id: params.id } });
  if (!election) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (election.status !== "DRAFT") {
    return NextResponse.json({ error: "Cannot edit positions after the election has gone live" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = addPositionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const count = await prisma.position.count({ where: { electionId: election.id } });
  const position = await prisma.position.create({
    data: { electionId: election.id, title: parsed.data.title, order: count },
  });

  return NextResponse.json({ position }, { status: 201 });
}
