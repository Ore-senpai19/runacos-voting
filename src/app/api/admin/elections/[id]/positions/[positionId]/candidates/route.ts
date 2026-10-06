import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { uploadCandidatePhoto, validateCandidatePhoto } from "@/lib/photo-storage";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; positionId: string } }
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const election = await prisma.election.findUnique({ where: { id: params.id } });
  if (!election) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (election.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Cannot edit candidates after the election has gone live" },
      { status: 400 }
    );
  }

  const position = await prisma.position.findUnique({ where: { id: params.positionId } });
  if (!position || position.electionId !== election.id) {
    return NextResponse.json({ error: "Position not found" }, { status: 404 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const name = String(form.get("name") || "").trim();
  const bio = String(form.get("bio") || "").trim();
  const photo = form.get("photo");

  if (!name) return NextResponse.json({ error: "Candidate name is required" }, { status: 400 });
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "Candidate photo is required" }, { status: 400 });
  }
  const photoError = validateCandidatePhoto(photo);
  if (photoError) return NextResponse.json({ error: photoError }, { status: 400 });

  let photoUrl: string;
  try {
    photoUrl = await uploadCandidatePhoto(photo);
  } catch (err) {
    console.error("[candidates/create] photo upload failed", err);
    return NextResponse.json(
      { error: "Could not upload the photo. Check the Supabase Storage setup and try again." },
      { status: 500 }
    );
  }

  const count = await prisma.candidate.count({ where: { positionId: position.id } });
  const candidate = await prisma.candidate.create({
    data: {
      positionId: position.id,
      name,
      bio: bio || null,
      photoUrl,
      order: count,
    },
  });

  return NextResponse.json({ candidate }, { status: 201 });
}
