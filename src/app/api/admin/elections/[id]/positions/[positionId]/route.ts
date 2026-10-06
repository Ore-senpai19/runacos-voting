import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { addPositionSchema } from "@/lib/validators";

async function assertDraftPosition(electionId: string, positionId: string) {
  const election = await prisma.election.findUnique({ where: { id: electionId } });
  if (!election) return { error: "Election not found", status: 404 as const };
  if (election.status !== "DRAFT") {
    return {
      error: "Positions can only be changed while the election is still a draft",
      status: 400 as const,
    };
  }
  const position = await prisma.position.findUnique({ where: { id: positionId } });
  if (!position || position.electionId !== electionId) {
    return { error: "Position not found", status: 404 as const };
  }
  return { election, position };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; positionId: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await assertDraftPosition(params.id, params.positionId);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const body = await req.json().catch(() => null);
  const parsed = addPositionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const position = await prisma.position.update({
    where: { id: params.positionId },
    data: { title: parsed.data.title },
  });

  return NextResponse.json({ position });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; positionId: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await assertDraftPosition(params.id, params.positionId);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  // Candidates cascade-delete automatically (onDelete: Cascade in schema).
  await prisma.position.delete({ where: { id: params.positionId } });

  return NextResponse.json({ ok: true });
}
