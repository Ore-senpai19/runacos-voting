"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Countdown } from "@/components/Countdown";
import { apiRequest, postJson } from "@/lib/api-client";
import { PasswordInput } from "@/components/PasswordInput";
import { VoteStepper } from "@/components/VoteStepper";

type Candidate = { id: string; name: string; photoUrl: string; bio: string | null };
type Position = { id: string; title: string; candidates: Candidate[] };
type ElectionStatusResponse = {
  election: { title: string; status: "DRAFT" | "LIVE" | "ENDED"; endTime: string | null };
  hasAccess: boolean;
  hasVoted: boolean;
};
type BallotResponse = { positions: Position[] };

type Phase = "loading" | "closed" | "locked" | "voting" | "review" | "submitting" | "done";

export default function ElectionVotePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const electionId = params.id;

  const [phase, setPhase] = useState<Phase>("loading");
  const [title, setTitle] = useState("");
  const [endTime, setEndTime] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const result = await apiRequest<ElectionStatusResponse>(`/api/elections/${electionId}`);
      if (!result.ok) {
        setError(result.error);
        setPhase("closed");
        return;
      }
      const data = result.data;
      setTitle(data.election.title);
      setEndTime(data.election.endTime);

      if (data.election.status !== "LIVE") {
        router.replace(
          data.election.status === "ENDED" ? `/election/${electionId}/results` : "/dashboard"
        );
        return;
      }
      if (data.hasVoted) {
        router.replace(`/election/${electionId}/review`);
        return;
      }
      if (data.hasAccess) {
        await loadBallot();
      } else {
        setPhase("locked");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [electionId]);

  async function loadBallot() {
    const result = await apiRequest<BallotResponse>(`/api/elections/${electionId}/ballot`);
    if (!result.ok) {
      setError(result.error);
      setPhase("closed");
      return;
    }
    setPositions(result.data.positions);
    setPhase("voting");
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await postJson(`/api/elections/${electionId}/access`, { password });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await loadBallot();
  }

  function selectCandidate(positionId: string, candidateId: string) {
    setSelections((prev) => ({ ...prev, [positionId]: candidateId }));
  }

  function goToReview() {
    if (positions.some((p) => !selections[p.id])) {
      setError("Pick a candidate for every position before reviewing.");
      return;
    }
    setError(null);
    setPhase("review");
  }

  async function finalSubmit() {
    setPhase("submitting");
    setError(null);
    const result = await postJson(`/api/elections/${electionId}/vote`, {
      selections: Object.entries(selections).map(([positionId, candidateId]) => ({
        positionId,
        candidateId,
      })),
    });
    if (!result.ok) {
      setError(result.error);
      setPhase("review");
      return;
    }
    setPhase("done");
  }

  if (phase === "loading") {
    return <Centered>Loading election…</Centered>;
  }

  if (phase === "closed") {
    return <Centered>{error || "This election is not currently open."}</Centered>;
  }

  if (phase === "locked") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <VoteStepper current={1} />
        <h1 className="mb-1 text-2xl font-semibold italic">{title}</h1>
        <p className="mb-6 text-sm text-ink-soft">Enter the election password to open your ballot.</p>
        <form onSubmit={submitPassword} className="card space-y-4">
          <PasswordInput
            required
            autoFocus
            placeholder="Election password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" className="btn-primary w-full">
            Unlock ballot
          </button>
        </form>
      </main>
    );
  }

  if (phase === "done") {
    return (
      <Centered>
        <div className="text-center">
          <VoteStepper current={4} />
          <div className="stamp-live mx-auto mb-4 w-fit">Vote Recorded</div>
          <h1 className="mb-2 text-2xl font-semibold italic">Thank you for voting</h1>
          <p className="mb-6 text-sm text-ink-soft">Your ballot has been submitted and cannot be changed.</p>
          <a href={`/election/${electionId}/review`} className="btn-primary">
            Review my votes
          </a>
        </div>
      </Centered>
    );
  }

  // voting or review
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <VoteStepper current={phase === "review" || phase === "submitting" ? 3 : 2} />
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold italic">{title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {phase === "review" ? "Review your picks before you submit." : "Select one candidate per position."}
          </p>
        </div>
        {endTime && <Countdown endTime={endTime} onExpire={() => router.refresh()} />}
      </header>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <div className="space-y-8">
        {positions.map((position) => (
          <section key={position.id}>
            <h2 className="mb-3 text-lg font-semibold">{position.title}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {position.candidates
                .filter((c) => phase === "voting" || c.id === selections[position.id])
                .map((c) => {
                  const chosen = selections[position.id] === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={phase === "review"}
                      onClick={() => selectCandidate(position.id, c.id)}
                      className={`card flex flex-col items-center gap-2 p-4 text-center transition ${
                        chosen ? "border-2 border-ink" : "hover:border-ink-soft"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.photoUrl}
                        alt={c.name}
                        className="h-20 w-20 rounded-full object-cover"
                      />
                      <span className="text-sm font-medium">{c.name}</span>
                      {chosen && <span className="text-xs font-semibold text-confirm">✓ Selected</span>}
                    </button>
                  );
                })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 flex justify-end gap-3">
        {phase === "voting" && (
          <button onClick={goToReview} className="btn-primary">
            Review my picks
          </button>
        )}
        {phase === "review" && (
          <>
            <button onClick={() => setPhase("voting")} className="btn-secondary">
              Change picks
            </button>
            <button onClick={finalSubmit} className="btn-primary">
              Submit final vote
            </button>
          </>
        )}
        {phase === "submitting" && (
          <button disabled className="btn-primary">
            Submitting…
          </button>
        )}
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-ink-soft">
      {children}
    </main>
  );
}
