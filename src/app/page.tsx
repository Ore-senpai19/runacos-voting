"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/lib/api-client";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await postJson("/api/auth/register", {
      firstName,
      surname,
      email,
      matricNumber,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await postJson("/api/auth/verify", { email, otp });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-10 text-center">
        <Logo size={64} className="mb-3" />
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-dark">RUNACOS</p>
        <h1 className="mt-2 text-3xl font-semibold italic">Elections</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Redeemer&apos;s University Association of Computing Students
        </p>
      </div>

      <div className="card">
        {step === "details" ? (
          <form onSubmit={requestOtp} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  First name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Surname
                </label>
                <input
                  type="text"
                  required
                  placeholder="Doe"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="field"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                School email
              </label>
              <input
                type="email"
                required
                placeholder="you@run.edu.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Matric number
              </label>
              <input
                type="text"
                required
                placeholder="RUN/CMP/24/00001"
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value)}
                className="field font-mono"
              />
              <p className="mt-1 text-xs text-ink-soft">
                CMP, CYB, or IFT students only.
              </p>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Sending code…" : "Send verification code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-sm text-ink-soft">
              We sent a 6-digit code to <span className="font-medium text-ink">{email}</span>.
            </p>
            <input
              type="text"
              required
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="field text-center font-mono text-lg tracking-[0.5em]"
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full">
              {loading ? "Verifying…" : "Verify & continue"}
            </button>
            <button
              type="button"
              onClick={() => setStep("details")}
              className="w-full text-center text-xs text-ink-soft underline"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-ink-soft">
        Election organiser?{" "}
        <a href="/admin/login" className="underline hover:text-ink">
          Admin sign in
        </a>
      </p>
    </main>
  );
}
