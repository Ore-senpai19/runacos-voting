/**
 * Wraps fetch + JSON parsing so that if the server ever returns something
 * that isn't JSON (a crashed route serving Next's HTML error page, a proxy
 * timeout page, etc.) the caller gets a clean, friendly error message
 * instead of "Unexpected token '<', is not valid JSON".
 */
export async function apiRequest<T = unknown>(
  input: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection and try again.", status: 0 };
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    // The server errored before our route handler could respond with JSON
    // (e.g. an unhandled exception, or the dev server restarting).
    return {
      ok: false,
      error:
        res.status >= 500
          ? "Something went wrong on the server. Please try again in a moment."
          : `Unexpected response from the server (status ${res.status}).`,
      status: res.status,
    };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "Received an invalid response from the server.", status: res.status };
  }

  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Something went wrong.";
    return { ok: false, error: message, status: res.status };
  }

  return { ok: true, data: data as T };
}

export function postJson<T = unknown>(url: string, body: unknown) {
  return apiRequest<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function patchJson<T = unknown>(url: string, body: unknown) {
  return apiRequest<T>(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
