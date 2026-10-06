"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { Logo } from "@/components/Logo";

type Candidate = { id: string; name: string; photoUrl: string; votes: number };
type Position = { id: string; title: string; candidates: Candidate[] };
type LiveData = {
  election: { id: string; title: string; status: "DRAFT" | "LIVE" | "ENDED"; endTime: string | null };
  totalVoters: number;
  positions: Position[];
};

const POLL_MS = 3000;

export default function LiveResultsPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dark, setDark] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const load = useCallback(async () => {
    const result = await apiRequest<LiveData>(`/api/admin/elections/${params.id}/live-results`);
    if (result.ok) {
      setData(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
  }, [params.id]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  const bg = dark ? "bg-[#0B0F1A] text-[#F7F5EF]" : "bg-paper text-ink";
  const cardBg = dark ? "bg-[#161C2C] border-[#2A3245]" : "bg-white border-line";
  const soft = dark ? "text-[#8891A8]" : "text-ink-soft";
  const barTrack = dark ? "bg-[#2A3245]" : "bg-line";

  return (
    <main className={`min-h-screen px-8 py-8 transition-colors ${bg}`}>
      <header className="mx-auto mb-10 flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo size={44} className="mx-0" />
          <div>
            <p className={`font-mono text-xs uppercase tracking-[0.3em] ${soft}`}>
              {data?.election.title || "Loading…"}
            </p>
            <div className="mt-1 flex items-center gap-2">
              {data?.election.status === "LIVE" && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-confirm">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-confirm" /> LIVE
                </span>
              )}
              {data?.election.status === "ENDED" && (
                <span className={`text-sm font-semibold ${soft}`}>Voting closed — final count</span>
              )}
              {data?.election.status === "DRAFT" && (
                <span className={`text-sm font-semibold ${soft}`}>Not live yet</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-mono text-4xl font-bold tabular-nums">{data?.totalVoters ?? "—"}</p>
            <p className={`text-xs uppercase tracking-wide ${soft}`}>votes cast</p>
          </div>
          <button
            onClick={() => setDark((d) => !d)}
            className={`rounded-sm border px-3 py-2 text-xs font-medium ${dark ? "border-[#2A3245]" : "border-line"}`}
          >
            {dark ? "Light" : "Dark"}
          </button>
          <button
            onClick={toggleFullscreen}
            className={`rounded-sm border px-3 py-2 text-xs font-medium ${dark ? "border-[#2A3245]" : "border-line"}`}
          >
            {isFullscreen ? "Exit full screen" : "Full screen"}
          </button>
          <Link
            href={`/admin/elections/${params.id}`}
            className={`rounded-sm border px-3 py-2 text-xs font-medium ${dark ? "border-[#2A3245]" : "border-line"}`}
          >
            Back
          </Link>
        </div>
      </header>

      {error && <p className="mx-auto max-w-5xl text-sm text-danger">{error}</p>}

      <div className="mx-auto max-w-5xl space-y-10">
        {data?.positions.map((position) => {
          const total = position.candidates.reduce((s, c) => s + c.votes, 0);
          const topVotes = position.candidates[0]?.votes ?? 0;
          return (
            <section key={position.id}>
              <h2 className="mb-4 text-2xl font-semibold italic">{position.title}</h2>
              <div className="space-y-4">
                {position.candidates.map((c) => {
                  const pct = total > 0 ? Math.round((c.votes / total) * 100) : 0;
                  const isLeading = c.votes === topVotes && total > 0;
                  return (
                    <div key={c.id} className={`rounded-sm border p-4 ${cardBg}`}>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.photoUrl}
                            alt={c.name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                          <span className="text-xl font-medium">{c.name}</span>
                        </div>
                        <span className="font-mono text-2xl font-bold tabular-nums">
                          {c.votes} <span className={`text-base font-normal ${soft}`}>({pct}%)</span>
                        </span>
                      </div>
                      <div className={`h-3 w-full overflow-hidden rounded-full ${barTrack}`}>
                        <div
                          className={`h-3 rounded-full transition-all duration-700 ease-out ${
                            isLeading ? "bg-gold" : dark ? "bg-[#4A5370]" : "bg-ink-soft"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {data && data.positions.length === 0 && (
          <p className={`text-center text-sm ${soft}`}>No positions set up yet.</p>
        )}
      </div>
    </main>
  );
}
