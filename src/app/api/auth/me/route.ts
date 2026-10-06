import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ student: null });

  const student = await prisma.student.findUnique({ where: { id: session.sub } });
  if (!student) return NextResponse.json({ student: null });

  return NextResponse.json({
    student: {
      email: student.email,
      firstName: student.firstName,
      surname: student.surname,
      matricNumber: student.matricNumber,
      department: student.department,
    },
  });
}
