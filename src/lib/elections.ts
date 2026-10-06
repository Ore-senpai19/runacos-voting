import { prisma } from "@/lib/db";
import type { Election } from "@prisma/client";

/**
 * The admin can end an election manually, but we also need it to close
 * automatically once its time limit is up even if nobody clicks anything.
 * Every read of a LIVE election runs through here first.
 */
export async function withAutoEnd(election: Election): Promise<Election> {
  if (election.status === "LIVE" && election.endTime && election.endTime <= new Date()) {
    return prisma.election.update({
      where: { id: election.id },
      data: { status: "ENDED" },
    });
  }
  return election;
}

export async function getElectionAutoEnded(id: string) {
  const election = await prisma.election.findUnique({ where: { id } });
  if (!election) return null;
  return withAutoEnd(election);
}
