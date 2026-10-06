import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { registerSchema, departmentFromMatric } from "@/lib/validators";
import { generateOtp } from "@/lib/otp";

// Doubles as "login": if the email already exists we just re-send an OTP
// (but we still require the matric number and surname to match, since
// together they're what proves this is actually your school email).
//
// Sending the code itself isn't done here — a Supabase Postgres trigger
// (see supabase/otp-email-trigger.sql) watches for otpCode changes on the
// Student table and emails it via Resend as soon as this write commits.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const { email, matricNumber, firstName, surname } = parsed.data;

    const department = departmentFromMatric(matricNumber);
    if (!department) {
      return NextResponse.json(
        { error: "Matric number must be RUN/CMP, RUN/CYB, or RUN/IFT" },
        { status: 400 }
      );
    }

    const existingByMatric = await prisma.student.findUnique({
      where: { matricNumber },
    });
    if (existingByMatric && existingByMatric.email !== email) {
      return NextResponse.json(
        { error: "This matric number is already registered to a different email." },
        { status: 409 }
      );
    }

    const existingByEmail = await prisma.student.findUnique({ where: { email } });
    if (existingByEmail && existingByEmail.matricNumber !== matricNumber) {
      return NextResponse.json(
        { error: "This email is already registered with a different matric number." },
        { status: 409 }
      );
    }

    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.student.upsert({
      where: { email },
      update: { otpCode, otpExpiresAt, firstName, surname },
      create: { email, matricNumber, department, firstName, surname, otpCode, otpExpiresAt },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/register]", err);
    return NextResponse.json(
      { error: "Something went wrong sending your code. Please try again." },
      { status: 500 }
    );
  }
}
