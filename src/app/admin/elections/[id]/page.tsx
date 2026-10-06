"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { StatusStamp } from "@/components/StatusStamp";
import { Countdown } from "@/components/Countdown";
import { apiRequest, postJson, patchJson } from "@/lib/api-client";

type Candidate = { id: string; name: string; photoUrl: string; bio: string | null };
type Position = { id: string; title: string; candidates: Candidate[] };
type ElectionDetail = {
  id: string;
  title: string;
  status: "DRAFT" | "LIVE" | "ENDED";
  durationMinutes: number;
  startTime: string | null;
  endTime: string | null;
  positions: Position[];
  _count: { votes: number; accesses: number };
};

export default function AdminElectionPage({ params }: { params: { id: string } }) {
  const [election, setElection] = useState<ElectionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newPositionTitle, setNewPositionTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editingPositionTitle, setEditingPositionTitle] = useState("");
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await apiRequest<{ election: ElectionDetail }>(`/api/admin/elections/${params.id}`);
    if (result.ok) {
      setElection(result.data.election);
    } else {
      setError(result.error);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function addPosition(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await postJson(`/api/admin/elections/${params.id}/positions`, {
      title: newPositionTitle,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNewPositionTitle("");
    load();
  }

  async function saveEditedPosition(positionId: string) {
    setError(null);
    setBusy(true);
    const result = await apiRequest(`/api/admin/elections/${params.id}/positions/${positionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editingPositionTitle }),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditingPositionId(null);
    load();
  }

  async function deletePosition(positionId: string, title: string) {
    if (!confirm(`Delete "${title}" and all its candidates? This cannot be undone.`)) return;
    setBusy(true);
    const result = await apiRequest(`/api/admin/elections/${params.id}/positions/${positionId}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    load();
  }

  async function addCandidate(positionId: string, form: HTMLFormElement) {
    setError(null);
    setBusy(true);
    const formData = new FormData(form);
    const result = await apiRequest(
      `/api/admin/elections/${params.id}/positions/${positionId}/candidates`,
      { method: "POST", body: formData }
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    form.reset();
    load();
  }

  async function saveEditedCandidate(positionId: string, candidateId: string, form: HTMLFormElement) {
    setError(null);
    setBusy(true);
    const formData = new FormData(form);
    const result = await apiRequest(
      `/api/admin/elections/${params.id}/positions/${positionId}/candidates/${candidateId}`,
      { method: "PATCH", body: formData }
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditingCandidateId(null);
    load();
  }

  async function deleteCandidate(positionId: string, candidateId: string, name: string) {
    if (!confirm(`Remove candidate "${name}"?`)) return;
    setBusy(true);
    const result = await apiRequest(
      `/api/admin/elections/${params.id}/positions/${positionId}/candidates/${candidateId}`,
      { method: "DELETE" }
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    load();
  }

  async function goLive() {
    setError(null);
    setBusy(true);
    const result = await patchJson(`/api/admin/elections/${params.id}`, { action: "go-live" });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    load();
  }

  async function endElection() {
    if (!confirm("End this election now? This cannot be undone.")) return;
    setBusy(true);
    const result = await patchJson(`/api/admin/elections/${params.id}`, { action: "end" });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    load();
  }

  if (!election) {
    return <main className="p-12 text-center text-sm text-ink-soft">Loading…</main>;
  }

  const isDraft = election.status === "DRAFT";

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <Link href="/admin" className="text-xs text-ink-soft underline">
        ← All elections
      </Link>

      <header className="mb-8 mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold italic">{election.title}</h1>
          <div className="mt-2 flex items-center gap-3">
            <StatusStamp status={election.status} />
            <span className="text-xs text-ink-soft">
              {election._count.votes} vote{election._count.votes === 1 ? "" : "s"} cast
            </span>
          </div>
          {election.status === "LIVE" && election.endTime && (
            <div className="mt-2">
              <Countdown endTime={election.endTime} onExpire={load} />
            </div>
          )}
          {election._count.votes > 0 && (
            <Link
              href={`/admin/elections/${election.id}/voters`}
              className="mt-2 inline-block text-xs text-ink-soft underline"
            >
              View who voted for whom →
            </Link>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {isDraft && (
            <button onClick={goLive} disabled={busy} className="btn-primary">
              Go live
            </button>
          )}
          {election.status === "LIVE" && (
            <>
              <Link href={`/admin/elections/${election.id}/live`} className="btn-gold">
                Open big screen
              </Link>
              <button onClick={endElection} disabled={busy} className="btn-secondary">
                End election now
              </button>
            </>
          )}
          {election.status === "ENDED" && (
            <Link href={`/admin/elections/${election.id}/results`} className="btn-gold">
              View results
            </Link>
          )}
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <div className="space-y-8">
        {election.positions.map((position) => (
          <section key={position.id} className="card">
            <div className="mb-3 flex items-center justify-between gap-2">
              {editingPositionId === position.id ? (
                <div className="flex flex-1 gap-2">
                  <input
                    value={editingPositionTitle}
                    onChange={(e) => setEditingPositionTitle(e.target.value)}
                    className="field flex-1"
                    autoFocus
                  />
                  <button
                    onClick={() => saveEditedPosition(position.id)}
                    disabled={busy}
                    className="btn-secondary text-xs"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingPositionId(null)}
                    className="text-xs text-ink-soft underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">{position.title}</h2>
                  {isDraft && (
                    <div className="flex shrink-0 gap-3 text-xs">
                      <button
                        onClick={() => {
                          setEditingPositionId(position.id);
                          setEditingPositionTitle(position.title);
                        }}
                        className="text-ink-soft underline hover:text-ink"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePosition(position.id, position.title)}
                        className="text-danger underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {position.candidates.length > 0 && (
              <ul className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {position.candidates.map((c) =>
                  editingCandidateId === c.id ? (
                    <li key={c.id} className="col-span-2 sm:col-span-3">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveEditedCandidate(position.id, c.id, e.currentTarget);
                        }}
                        className="flex flex-wrap items-end gap-2 rounded-sm border border-line p-3"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.photoUrl} alt={c.name} className="h-10 w-10 rounded-full object-cover" />
                        <input name="name" required defaultValue={c.name} className="field flex-1" />
                        <input name="bio" defaultValue={c.bio || ""} placeholder="Bio (optional)" className="field flex-1" />
                        <div>
                          <label className="block text-xs text-ink-soft">Replace photo (optional)</label>
                          <input type="file" name="photo" accept="image/*" className="text-xs" />
                        </div>
                        <button type="submit" disabled={busy} className="btn-secondary text-xs">
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCandidateId(null)}
                          className="text-xs text-ink-soft underline"
                        >
                          Cancel
                        </button>
                      </form>
                    </li>
                  ) : (
                    <li key={c.id} className="flex flex-col items-center gap-1 text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.photoUrl} alt={c.name} className="h-16 w-16 rounded-full object-cover" />
                      <span className="text-xs font-medium">{c.name}</span>
                      {isDraft && (
                        <div className="flex gap-2 text-[11px]">
                          <button
                            onClick={() => setEditingCandidateId(c.id)}
                            className="text-ink-soft underline hover:text-ink"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteCandidate(position.id, c.id, c.name)}
                            className="text-danger underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </li>
                  )
                )}
              </ul>
            )}

            {isDraft && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addCandidate(position.id, e.currentTarget);
                }}
                className="flex flex-wrap items-end gap-2 border-t border-line pt-4"
              >
                <input name="name" required placeholder="Candidate name" className="field flex-1" />
                <input type="file" name="photo" required accept="image/*" className="text-xs" />
                <button type="submit" disabled={busy} className="btn-secondary">
                  Add candidate
                </button>
              </form>
            )}
          </section>
        ))}

        {isDraft && (
          <form onSubmit={addPosition} className="card flex gap-2">
            <input
              value={newPositionTitle}
              onChange={(e) => setNewPositionTitle(e.target.value)}
              required
              placeholder="Position, e.g. President"
              className="field flex-1"
            />
            <button type="submit" className="btn-primary shrink-0">
              Add position
            </button>
          </form>
        )}
      </div>

      {isDraft && (
        <p className="mt-6 text-xs text-ink-soft">
          Each position needs at least 2 candidates before you can go live. Once live, positions and
          candidates are locked — editing and deleting are only available while still a draft.
        </p>
      )}
    </main>
  );
}
