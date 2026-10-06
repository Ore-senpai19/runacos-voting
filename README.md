# RUNACOS Elections

A voting platform built for the Redeemer's University Association of Computing Students —
restricted to `@run.edu.ng` emails and `RUN/CMP`, `RUN/CYB`, `RUN/IFT` matric numbers.

## Stack and why

- **Next.js 14 (App Router) + TypeScript** — one project serves both the UI and the API
  routes, so there's no separate backend to host or CORS to configure.
- **Prisma + Supabase Postgres** — the schema itself is what makes the hard rules impossible
  to break: "one vote per student per position" is a database unique constraint (`Vote` is
  unique on `electionId + positionId + studentId`), not just a check in application code, and
  there is **no update or delete route for votes anywhere in the app** — only inserts. That's
  what makes results tamper-proof: nothing, including the admin, has a way to modify a vote
  once it's cast.
- **A Supabase Postgres trigger, not this app, sends OTP emails.** This app only ever writes
  the OTP code to the `Student` table; a database trigger (`supabase/otp-email-trigger.sql`)
  watches for that write and calls the Resend API directly from Postgres via the `pg_net`
  extension. There is no SMTP config and no mail-sending code in the app itself — see
  **Setting up OTP email delivery** below, it's a required step, not optional.
- **jose (JWT) + httpOnly cookies** — two independent sessions (student, admin), signed with
  `JWT_SECRET`.
- **Tailwind CSS** — a small custom token system (see `tailwind.config.ts` / `globals.css`)
  rather than generic defaults: paper background, ink text, a gold "ballot stamp" accent used
  for election status badges, and a green checkmark stamp marking winners on results pages.

## How the rules are enforced

| Requirement | Where it's enforced |
|---|---|
| Only `@run.edu.ng` emails, strictly `name123@run.edu.ng` shaped | `src/lib/validators.ts` — `schoolEmailRegex` requires letters immediately followed by digits and nothing else (no dots, plus-addressing, or underscores), checked server-side on every register call, never trusts the client |
| Only `RUN/CMP`, `RUN/CYB`, `RUN/IFT` matric numbers | Same file — `matricRegex` also derives the department shown in the UI |
| Only students admitted 2022 or later | `MIN_ADMISSION_YEAR` in `validators.ts` (currently `22`); `admissionYearFromMatric()` reads the two-digit year out of the matric number and the register route rejects anything earlier with a clear, specific error (this one isn't hidden — eligibility-by-year is a known, public rule, unlike the email-pattern check below) |
| Email matches the student's real name + matric | RUN emails follow `surname` + last 5 digits of the matric ID (e.g. `doe00001@run.edu.ng`). `expectedEmailLocalPart()` in `validators.ts` derives that and rejects a mismatch — but the error message is deliberately vague ("These details could not be verified") so the pattern itself isn't leaked to anyone probing the form. A **first name** field sits next to surname purely so the form reads as an ordinary name field rather than obviously fishing for one specific value |
| Election name, password, ≤2 hour time limit | `POST /api/admin/elections` (`zod` schema caps `durationMinutes` at 120); the clock (`startTime`/`endTime`) is only set the moment the admin clicks **Go live**, not at creation |
| Admin can end an election anytime | `PATCH /api/admin/elections/[id]` with `action: "end"`; also auto-flips `LIVE → ENDED` on any read once `endTime` has passed, so it closes on time even if nobody's looking at the admin screen |
| Admin can add/edit/delete positions and candidates | `PATCH`/`DELETE` routes under `.../positions/[positionId]` and `.../candidates/[candidateId]` — all guarded so they only work while the election is still `DRAFT`; once live, everything locks the same way it always has |
| Admin can't tamper with **results** | No write endpoint touches `Vote` rows after creation. Results (`/api/elections/[id]/results`) only ever run a `groupBy`-style read |
| Admin can see who voted for whom | `/admin/elections/[id]/voters` and its backing `GET /api/admin/elections/[id]/voter-log` route — admin-only, never exposed to the student-facing results page, which stays aggregate-only |
| One vote per student per election | `Vote` DB unique constraint on `(electionId, positionId, studentId)`; the submit route also pre-checks and rejects a second submission with 409 |
| Login only with school email + only during the set time window | Every voting route re-checks `election.status === "LIVE"` and the student session on each request, not just on page load |
| Password-gated ballot access | `ElectionAccess` row created only after a correct `bcrypt.compare` against the admin's hash |
| One candidate per position | Ballot submission is rejected unless it has exactly one selection per position, all validated server-side against the real candidate list |
| Review and change picks before submitting | The voting page holds selections in local React state through a **Review** step; nothing is written to the database until **Submit final vote** |
| Review after submitting, but can't edit | `/election/[id]/review` is a read-only Server Component with no form controls; there is no API route that could edit a vote even if one were added to the UI |

## Project layout

```
prisma/schema.prisma        Data model
prisma/seed.ts              Creates the first admin account
supabase/otp-email-trigger.sql   The only OTP-sending mechanism — a Postgres trigger + setup checklist
src/lib/                    validators, db client, auth/session, otp generation, election helpers, Supabase Storage uploads (candidate photos)
src/app/api/                All API routes (auth, admin, elections)
src/app/page.tsx            Student login (name + email + matric -> OTP)
src/app/dashboard/          Student: list of live/ended elections
src/app/election/[id]/      Vote, review, results (student-facing)
src/app/admin/              Admin login, dashboard, election builder, voter log, results
src/components/             Shared UI: status stamp, winner stamp, countdown, logout, copy-link
```

## Local setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) if you don't already
   have one (free tier is enough).

2. **Get your connection strings.** In the Supabase dashboard: Project Settings → Database →
   Connection string. You need two:
   - the **pooled** URI (port 6543, includes `?pgbouncer=true`) → `DATABASE_URL`
   - the **direct** URI (port 5432) → `DIRECT_URL` (used only for `prisma db push`)

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Fill in `DATABASE_URL` and `DIRECT_URL` with your real connection strings (including your
   database password), and set `JWT_SECRET` (e.g. `openssl rand -hex 32`) and
   `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

4. **Install dependencies**
   ```bash
   npm install
   ```
   (`postinstall` runs `prisma generate` automatically — needs normal internet access to
   `binaries.prisma.sh`, which most environments have.)

5. **Create the database tables and seed the first admin**
   ```bash
   npm run db:push
   npm run db:seed
   ```

6. **Set up OTP email delivery** — follow the checklist in
   `supabase/otp-email-trigger.sql` (Resend account, run the SQL file in the Supabase SQL
   Editor, store the API key in Vault). This is required before student login will actually
   deliver codes anywhere — **this app has no fallback email path of its own**.

7. **Set up candidate photo storage.** In the Supabase dashboard: **Storage → New bucket**,
   name it `candidate-photos` (or whatever you set `SUPABASE_STORAGE_BUCKET` to), toggle
   **Public bucket** ON, and create it. Then, **Project Settings → API**, copy the **Project
   URL** into `SUPABASE_URL` and the **service_role** secret key into
   `SUPABASE_SERVICE_ROLE_KEY` in your `.env` — this key is highly privileged, never expose it
   to the browser or commit it anywhere public. Candidate photo uploads won't work until this
   is done, on any environment, local or deployed.

8. **Run it**
   ```bash
   npm run dev
   ```
   Students sign in at `/`, the admin at `/admin/login`.

## Deploying

- **Candidate photos** are stored in Supabase Storage (step 7 above), not on disk — this
  means they persist correctly on serverless hosts like Vercel, where the filesystem is
  read-only and resets on every deploy. Just make sure `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` are set as environment variables on whatever platform you deploy
  to (e.g. Vercel → Project Settings → Environment Variables) — they don't get picked up from
  your local `.env` automatically.
- **OTP email**: before letting real students in, verify your own sending domain in Resend
  (Domains → Add Domain) rather than using the shared `onboarding@resend.dev` test address —
  see the checklist at the bottom of `supabase/otp-email-trigger.sql`.
- Set `JWT_SECRET` to a real random value in production — the fallback in the code is only
  for accidental local runs without a `.env`.

## Admin workflow

1. Sign in at `/admin/login`.
2. **New election** → name it, set the voting password, pick a time limit (max 2 hours).
   It's created as a **draft** — the clock hasn't started.
3. Add each position (e.g. President, VP, Financial Secretary) and, per position, add at
   least 2 candidates with a photo. You can edit or delete a position or candidate any time
   before going live — once live, everything locks.
4. Click **Go live** — this locks positions/candidates, starts the countdown, and makes the
   election appear on students' dashboards. Share the election password with voters through
   whatever channel your association normally uses (group chat, notice board, etc.) — the app
   intentionally doesn't broadcast it.
5. The election closes automatically when time runs out, or click **End election now** to
   close it early.
6. Once ended, **View results** shows the final tally with a **Copy shareable link** button —
   that link is the same read-only results page students see, so sharing it doesn't expose
   anything an admin screen wouldn't. Separately, **View who voted for whom** (available as
   soon as votes start coming in) is an admin-only log of exactly which candidate each named
   student picked, for verification purposes — it's never shown to students and isn't linked
   from anywhere public.

## Notes / things you may want to extend

- There's currently no self-serve "forgot password" for admins — reset by running the seed
  script again with a new `SEED_ADMIN_PASSWORD`, or add a row directly via `npm run db:studio`.
- Multiple admin accounts are supported by the schema (`Admin` table), but there's no UI to
  create additional ones yet — add rows via `prisma studio` or extend the seed script.
- Rate limiting on the OTP endpoint (to stop someone spamming a classmate's inbox) isn't
  implemented — worth adding before a real campus-wide launch.
