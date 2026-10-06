import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-only-insecure-secret-change-me"
);

export const STUDENT_COOKIE = "runacos_student";
export const ADMIN_COOKIE = "runacos_admin";

type StudentClaims = { sub: string; role: "student"; email: string };
type AdminClaims = { sub: string; role: "admin"; email: string };

async function sign(claims: StudentClaims | AdminClaims, expiresIn: string) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function createStudentSession(studentId: string, email: string) {
  const token = await sign({ sub: studentId, role: "student", email }, "12h");
  cookies().set(STUDENT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function createAdminSession(adminId: string, email: string) {
  const token = await sign({ sub: adminId, role: "admin", email }, "8h");
  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export function clearStudentSession() {
  cookies().delete(STUDENT_COOKIE);
}

export function clearAdminSession() {
  cookies().delete(ADMIN_COOKIE);
}

export async function getStudentSession(): Promise<StudentClaims | null> {
  const token = cookies().get(STUDENT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "student") return null;
    return payload as unknown as StudentClaims;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminClaims | null> {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "admin") return null;
    return payload as unknown as AdminClaims;
  } catch {
    return null;
  }
}
