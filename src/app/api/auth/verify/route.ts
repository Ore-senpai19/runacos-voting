import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySchema } from "@/lib/validators";
import { createStudentSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { email, otp } = parsed.data;

    const student = await prisma.student.findUnique({ where: { email } });
    if (!student || !student.otpCode || !student.otpExpiresAt) {
      return NextResponse.json({ error: "No verification code pending" }, { status: 400 });
    }
    if (student.otpExpiresAt < new Date()) {
      return NextResponse.json({ error: "Code expired, request a new one" }, { status: 400 });
    }
    if (student.otpCode !== otp) {
      return NextResponse.json({ error: "Incorrect code" }, { status: 400 });
    }

    await prisma.student.update({
      where: { id: student.id },
      data: { verified: true, otpCode: null, otpExpiresAt: null },
    });

    await createStudentSession(student.id, student.email);

    return NextResponse.json({
      ok: true,
      student: {
        email: student.email,
        matricNumber: student.matricNumber,
        department: student.department,
      },
    });
  } catch (err) {
    console.error("[auth/verify]", err);
    return NextResponse.json(
      { error: "Something went wrong verifying your code. Please try again." },
      { status: 500 }
    );
  }
}
