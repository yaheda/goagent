interface HunterResult {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}

export async function findEmailByDomain(domain: string): Promise<HunterResult> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return { email: null, firstName: null, lastName: null };

  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return { email: null, firstName: null, lastName: null };

  const data = await res.json();
  const emails: Array<{ value: string; first_name?: string; last_name?: string }> =
    data?.data?.emails ?? [];

  if (emails.length === 0) return { email: null, firstName: null, lastName: null };

  const first = emails[0];
  return {
    email: first.value ?? null,
    firstName: first.first_name ?? null,
    lastName: first.last_name ?? null,
  };
}

export async function findEmailByName(firstName: string, lastName: string, domain: string): Promise<HunterResult> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return { email: null, firstName: null, lastName: null };

  const url = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return { email: null, firstName, lastName };

  const data = await res.json();
  const email = data?.data?.email ?? null;
  return { email, firstName, lastName };
}

export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
