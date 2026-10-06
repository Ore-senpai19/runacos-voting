"use client";

import { useRouter } from "next/navigation";

export function LogoutButton({ scope }: { scope: "student" | "admin" }) {
  const router = useRouter();
  const endpoint = scope === "admin" ? "/api/admin/logout" : "/api/auth/logout";
  const redirectTo = scope === "admin" ? "/admin/login" : "/";

  async function handleLogout() {
    await fetch(endpoint, { method: "POST" });
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className="btn-secondary shrink-0">
      Sign out
    </button>
  );
}
