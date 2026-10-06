-- =============================================================================
-- RUNACOS Elections — the ONLY way OTP codes get emailed
-- =============================================================================
-- This app never sends email itself. Whenever a Student row's "otpCode"
-- column is set (or changed) by the app, this database trigger fires and
-- calls the Resend email API directly from Postgres using the pg_net
-- extension. That's the entire delivery mechanism — no SMTP, no mail
-- server, nothing to configure in .env.
--
-- Run this whole file once in the Supabase SQL Editor (Project -> SQL
-- Editor -> New query), AFTER you've run `npx prisma db push` at least once
-- so the "Student" table already exists.
-- =============================================================================

-- 1. Enable the extension that lets Postgres make outbound HTTP calls.
create extension if not exists pg_net with schema extensions;

-- 2. Store your Resend API key in Supabase Vault instead of hardcoding it
--    in SQL (Vault encrypts it at rest). Run this ONCE with your real key —
--    see the setup checklist below for where to get one:
--
--    select vault.create_secret('YOUR_RESEND_API_KEY_HERE', 'resend_api_key');
--
--    To rotate it later:
--    select vault.update_secret(
--      (select id from vault.secrets where name = 'resend_api_key'),
--      'YOUR_NEW_KEY'
--    );

-- 3. The function that actually sends the email. Fires after any insert or
--    update where "otpCode" ends up non-null, and skips firing again if the
--    code didn't actually change (e.g. an unrelated update to the row).
create or replace function public.send_student_otp_email()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  resend_api_key text;
  -- While testing, Resend lets any account send from this shared address
  -- with no domain verification needed. Swap to your own verified domain
  -- (e.g. 'RUNACOS Elections <no-reply@yourdomain.com>') before real use —
  -- see the setup checklist below.
  sender_address text := 'RUNACOS Elections <onboarding@resend.dev>';
begin
  if new."otpCode" is null then
    return new;
  end if;

  if TG_OP = 'UPDATE' and OLD."otpCode" is not distinct from NEW."otpCode" then
    return new;
  end if;

  select decrypted_secret into resend_api_key
  from vault.decrypted_secrets
  where name = 'resend_api_key';

  if resend_api_key is null then
    raise warning 'resend_api_key not found in Vault — OTP email not sent for %', new."email";
    return new;
  end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', sender_address,
      'to', new."email",
      'subject', 'Your RUNACOS Elections verification code',
      'html',
        '<p>Your RUNACOS Elections verification code is:</p>' ||
        '<p style="font-size:28px;font-weight:bold;letter-spacing:4px">' || new."otpCode" || '</p>' ||
        '<p>It expires in 10 minutes. If you did not request this, ignore this email.</p>'
    )
  );

  return new;
end;
$$;

-- 4. Attach the trigger to the Student table. Matches Prisma's default
--    table/column naming (PascalCase table, camelCase columns, both
--    case-sensitive so they must stay quoted).
drop trigger if exists trg_send_student_otp_email on "Student";

create trigger trg_send_student_otp_email
after insert or update of "otpCode" on "Student"
for each row
execute function public.send_student_otp_email();

-- =============================================================================
-- Full setup checklist (do these in order)
-- =============================================================================
-- 1. Create a Supabase project at https://supabase.com if you don't have one.
-- 2. Project Settings -> Database -> Connection string: copy the pooled
--    (port 6543) URI into DATABASE_URL and the direct (port 5432) URI into
--    DIRECT_URL in your .env. Fill in your actual database password.
-- 3. Run `npx prisma db push` locally — this creates all the tables,
--    including "Student", using DIRECT_URL.
-- 4. Sign up at https://resend.com (free tier is plenty for one
--    association's elections) and copy an API key from the dashboard.
-- 5. In the Supabase SQL Editor, run this entire file.
-- 6. Then, in the same SQL Editor, run (with your real key):
--      select vault.create_secret('re_your_actual_key_here', 'resend_api_key');
-- 7. Test it: register on the site with a real @run.edu.ng email. The code
--    should land in that inbox within a few seconds (check spam the first
--    time — mail from a shared address like onboarding@resend.dev is more
--    likely to be flagged than mail from your own verified domain).
-- 8. Before real use: verify your own sending domain in Resend (Domains ->
--    Add Domain, then add the DNS records they give you), and update the
--    `sender_address` line above to use it, then re-run steps 5 (just the
--    CREATE OR REPLACE FUNCTION part is enough to update it).
--
-- To debug delivery issues, check Database -> Logs -> Postgres Logs in the
-- Supabase dashboard, or query:
--   select * from net._http_response order by created desc limit 5;
-- =============================================================================
