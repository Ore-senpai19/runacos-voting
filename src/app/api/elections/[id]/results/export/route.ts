import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { getStudentSession, getAdminSession } from "@/lib/auth";
import { getElectionAutoEnded } from "@/lib/elections";

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "election"
  );
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const student = await getStudentSession();
  const admin = await getAdminSession();
  if (!student && !admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const election = await getElectionAutoEnded(params.id);
  if (!election) return NextResponse.json({ error: "Election not found" }, { status: 404 });
  if (election.status !== "ENDED") {
    return NextResponse.json({ error: "Results are available once the election ends" }, { status: 400 });
  }

  const positions = await prisma.position.findMany({
    where: { electionId: election.id },
    orderBy: { order: "asc" },
    include: {
      candidates: { orderBy: { order: "asc" }, include: { _count: { select: { votes: true } } } },
    },
  });

  const totalVoters = await prisma.vote
    .findMany({ where: { electionId: election.id }, distinct: ["studentId"] })
    .then((v) => v.length);

  const rows: (string | number)[][] = [
    [election.title],
    [`Exported ${new Date().toLocaleString("en-GB")}`],
    [`${totalVoters} student${totalVoters === 1 ? "" : "s"} voted`],
    [],
    ["Position", "Candidate", "Votes", "Percentage", "Winner"],
  ];

  for (const position of positions) {
    const sorted = [...position.candidates].sort((a, b) => b._count.votes - a._count.votes);
    const total = sorted.reduce((sum, c) => sum + c._count.votes, 0);
    const topVotes = sorted[0]?._count.votes ?? 0;
    for (const c of sorted) {
      const pct = total > 0 ? c._count.votes / total : 0;
      const isWinner = c._count.votes === topVotes && total > 0;
      rows.push([position.title, c.name, c._count.votes, pct, isWinner ? "Yes" : ""]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 22 }, { wch: 24 }, { wch: 10 }, { wch: 12 }, { wch: 8 }];
  // Format the "Percentage" column (column D, from the header row down) as a percentage.
  const headerRowIndex = 4; // 0-based index of the ["Position", ...] row
  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const cellRef = XLSX.utils.encode_cell({ r, c: 3 });
    if (ws[cellRef]) ws[cellRef].z = "0.0%";
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Results");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${slugify(election.title)}-results.xlsx"`,
    },
  });
}
