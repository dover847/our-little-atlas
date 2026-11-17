// Read pasted URLs locally; never navigate to or fetch them. Actual credentials
// are verified by Supabase in the server action, not trusted because of the URL.
export function recoveredSession(value: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const fragment = new URLSearchParams(url.hash.slice(1));
    const access = fragment.get("access_token") || "";
    const refresh = fragment.get("refresh_token") || "";
    if (!access || !refresh || access.length > 12000 || refresh.length > 1000)
      return null;
    return { access, refresh };
  } catch {
    return null;
  }
}
