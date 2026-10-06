"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/api-client";
import { PasswordInput } from "@/components/PasswordInput";
import { DurationPicker } from "@/components/DurationPicker";

export default function NewElectionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await postJson<{ election: { id: string } }>("/api/admin/elections", {
      title,
      password,
      durationMinutes: duration,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/admin/elections/${result.data.election.id}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold italic">New election</h1>
      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Election name
          </label>
          <input
            required
            placeholder="RUNACOS 2026 Executive Elections"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Voting password
          </label>
          <PasswordInput
            required
            placeholder="Shared with voters when polls open"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field font-mono"
          />
        </div>

        <div>
          <label className="mb-2 block text-center text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Time limit
          </label>
          <DurationPicker minutes={duration} onChange={setDuration} />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading || duration < 1} className="btn-primary w-full">
          {loading ? "Creating…" : "Create draft"}
        </button>
        <p className="text-xs text-ink-soft">
          You&apos;ll add positions and candidates next. The clock only starts once you go live.
        </p>
      </form>
    </main>
  );
}
