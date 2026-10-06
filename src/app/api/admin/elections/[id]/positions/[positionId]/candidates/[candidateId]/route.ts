import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import {
  uploadCandidatePhoto,
  deleteCandidatePhoto,
  validateCandidatePhoto,
} from "@/lib/photo-storage";

async function assertDraftCandidate(electionId: string, positionId: string, candidateId: string) {
  const election = await prisma.election.findUnique({ where: { id: electionId } });
  if (!election) return { error: "Election not found", status: 404 as const };
  if (election.status !== "DRAFT") {
    return {
      error: "Candidates can only be changed while the election is still a draft",
      status: 400 as const,
    };
  }
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  if (!candidate || candidate.positionId !== positionId) {
    return { error: "Candidate not found", status: 404 as const };
  }
  return { election, candidate };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; positionId: string; candidateId: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await assertDraftCandidate(params.id, params.positionId, params.candidateId);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const name = String(form.get("name") || "").trim();
  const bio = String(form.get("bio") || "").trim();
  const photo = form.get("photo");

  if (!name) return NextResponse.json({ error: "Candidate name is required" }, { status: 400 });

  let photoUrl: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    const photoError = validateCandidatePhoto(photo);
    if (photoError) return NextResponse.json({ error: photoError }, { status: 400 });
    try {
      photoUrl = await uploadCandidatePhoto(photo);
    } catch (err) {
      console.error("[candidates/edit] photo upload failed", err);
      return NextResponse.json(
        { error: "Could not upload the new photo. Check the Supabase Storage setup and try again." },
        { status: 500 }
      );
    }
  }

  const candidate = await prisma.candidate.update({
    where: { id: params.candidateId },
    data: { name, bio: bio || null, ...(photoUrl ? { photoUrl } : {}) },
  });

  if (photoUrl) {
    await deleteCandidatePhoto(check.candidate.photoUrl);
  }

  return NextResponse.json({ candidate });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; positionId: string; candidateId: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await assertDraftCandidate(params.id, params.positionId, params.candidateId);
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  await prisma.candidate.delete({ where: { id: params.candidateId } });
  await deleteCandidatePhoto(check.candidate.photoUrl);

  return NextResponse.json({ ok: true });
}
