import Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "@/lib/ai/models";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ScrapeResult {
  email: string | null;
  hasForm: boolean;
  sourceUrl: string | null;
}

// Stable system prompt — cached across repeated scrape calls in a session
const SYSTEM_PROMPT = `You are a contact information extraction assistant.
Given the HTML content of a company webpage, extract:
1. Any visible email address (handle obfuscated formats like "info [at] domain [dot] com", "info(at)domain.com", or split across HTML elements)
2. Whether a contact form is present (a <form> element that a user could fill out)

Return a JSON object with exactly these fields:
{
  "email": "found@email.com or null if none",
  "hasForm": true or false
}

Return only valid JSON, no markdown fences. If no email is found, set email to null.`;

const CONTACT_PATHS = ["/contact", "/contact-us", "/about/contact", "/kontakt", "/contacto", "/nous-contacter"];

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GoAgent/1.0)" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Truncate to keep within token limits — contact info is usually near the top
    return html.slice(0, 40000);
  } catch {
    return null;
  }
}

async function extractFromHtml(html: string, pageUrl: string): Promise<{ email: string | null; hasForm: boolean }> {
  const response = await client.messages.create({
    model: MODELS.extraction,
    max_tokens: 256,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        // Prompt caching: stable system prompt reused across all scrape calls
        cache_control: { type: "ephemeral" },
      },
    ] as Parameters<typeof client.messages.create>[0]["system"],
    messages: [
      {
        role: "user",
        content: `URL: ${pageUrl}\n\nHTML:\n${html}`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as Anthropic.TextBlock).text)
    .join("")
    .trim();

  try {
    const parsed = JSON.parse(text);
    return { email: parsed.email ?? null, hasForm: !!parsed.hasForm };
  } catch {
    const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    return { email: emailMatch?.[0] ?? null, hasForm: text.toLowerCase().includes("true") };
  }
}

async function findContactLinkOnHomepage(baseUrl: string): Promise<string | null> {
  const html = await fetchPage(baseUrl);
  if (!html) return null;

  // Look for contact hrefs in nav/header
  const matches = html.match(/href=["']([^"']*contact[^"']*)["']/gi) ?? [];
  for (const m of matches) {
    const href = m.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
  }
  return null;
}

export async function scrapeContactInfo(websiteUrl: string): Promise<ScrapeResult> {
  let base: string;
  try {
    const parsed = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
    base = parsed.origin;
  } catch {
    return { email: null, hasForm: false, sourceUrl: null };
  }

  // Try known contact paths
  for (const path of CONTACT_PATHS) {
    const url = base + path;
    const html = await fetchPage(url);
    if (!html) continue;

    const result = await extractFromHtml(html, url);
    if (result.email || result.hasForm) {
      return { ...result, sourceUrl: url };
    }
  }

  // Fall back: find contact link on homepage
  const contactLink = await findContactLinkOnHomepage(base);
  if (contactLink) {
    const html = await fetchPage(contactLink);
    if (html) {
      const result = await extractFromHtml(html, contactLink);
      if (result.email || result.hasForm) {
        return { ...result, sourceUrl: contactLink };
      }
    }
  }

  return { email: null, hasForm: false, sourceUrl: null };
}
