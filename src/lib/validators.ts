import { z } from "zod";

const DOMAIN = process.env.SCHOOL_EMAIL_DOMAIN || "run.edu.ng";

// Strictly "name immediately followed by digits" — e.g. doe00001@run.edu.ng.
// No dots, plus-addressing, or underscores: RUN student emails never contain
// those, so allowing them would only widen the door for typo'd or spoofed
// addresses to slip past the basic format check.
export const schoolEmailRegex = new RegExp(`^[a-zA-Z]+[0-9]+@${DOMAIN.replace(/\./g, "\\.")}$`);

// e.g. RUN/CMP/24/17183, RUN/CYB/23/16234, RUN/IFT/25/18763
// Capture groups: 1 = department code, 2 = two-digit admission year, 3 = ID digits.
export const matricRegex = /^RUN\/(CMP|CYB|IFT)\/(\d{2})\/(\d{3,6})$/i;

// Two-digit admission year floor: 22 = 2022. Students admitted in 2021 or
// earlier (year digits 21 and below) are not eligible to vote.
export const MIN_ADMISSION_YEAR = 22;

const DEPARTMENTS: Record<string, string> = {
  CMP: "Computer Science",
  CYB: "Cyber Security",
  IFT: "Information Technology",
};

export function departmentFromMatric(matric: string): string | null {
  const match = matric.toUpperCase().match(matricRegex);
  if (!match) return null;
  return DEPARTMENTS[match[1]];
}

export function admissionYearFromMatric(matric: string): number | null {
  const match = matric.toUpperCase().match(matricRegex);
  if (!match) return null;
  return parseInt(match[2], 10);
}

export function normalizeMatric(matric: string): string {
  return matric.trim().toUpperCase();
}

/**
 * RUN student emails follow a fixed pattern: surname + the last 5 digits of
 * the matric number's ID segment, e.g. matric RUN/CMP/24/00001 + surname
 * "Doe" -> doe00001@run.edu.ng. We use this to catch typos and to
 * make it harder to register with an email that isn't actually yours, since
 * knowing someone's matric number alone isn't enough to pass this check.
 */
export function expectedEmailLocalPart(surname: string, matric: string): string | null {
  const match = matric.toUpperCase().match(matricRegex);
  if (!match) return null;
  const idSegment = matric.split("/").pop() || "";
  const digitsOnly = idSegment.replace(/\D/g, "");
  const last5 = digitsOnly.slice(-5);
  if (last5.length < 5) return null; // ID segment too short to derive a reliable check
  const cleanSurname = surname.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!cleanSurname) return null;
  return `${cleanSurname}${last5}`;
}

export const nameSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} is required`)
    .max(40)
    .regex(/^[a-zA-Z-]+$/, `${label} should contain letters only`);

export const registerSchema = z
  .object({
    firstName: nameSchema("First name"),
    surname: nameSchema("Surname"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        schoolEmailRegex,
        `Email must be your name immediately followed by digits, e.g. doe00001@${DOMAIN}`
      ),
    matricNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        matricRegex,
        "Matric number must look like RUN/CMP/24/17183 (CMP, CYB, or IFT only)"
      ),
  })
  .superRefine((data, ctx) => {
    const year = admissionYearFromMatric(data.matricNumber);
    if (year !== null && year < MIN_ADMISSION_YEAR) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["matricNumber"],
        message: "This student is not eligible to vote in RUNACOS elections.",
      });
    }

    const expected = expectedEmailLocalPart(data.surname, data.matricNumber);
    const actualLocalPart = data.email.split("@")[0];
    if (expected && actualLocalPart !== expected) {
      // Deliberately vague: revealing the derivation (surname + last-5-digits)
      // would let anyone reverse-engineer someone else's expected email from
      // just their name and matric number, defeating the point of the check.
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "These details could not be verified. Please double-check them and try again.",
      });
    }
  });

export const verifySchema = z.object({
  email: z.string().trim().toLowerCase(),
  otp: z.string().trim().length(6),
});

export const MAX_ELECTION_MINUTES = 120;

export const createElectionSchema = z.object({
  title: z.string().trim().min(3).max(120),
  durationMinutes: z.number().int().min(1).max(MAX_ELECTION_MINUTES),
  password: z.string().min(4).max(64),
});

export const addPositionSchema = z.object({
  title: z.string().trim().min(2).max(80),
});

export const accessElectionSchema = z.object({
  password: z.string().min(1),
});

export const submitVotesSchema = z.object({
  selections: z
    .array(
      z.object({
        positionId: z.string().min(1),
        candidateId: z.string().min(1),
      })
    )
    .min(1),
});
