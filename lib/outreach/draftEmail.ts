import Anthropic from "@anthropic-ai/sdk";
import type { Prospect } from "@/lib/db/schema";
import { MODELS } from "@/lib/ai/models";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type OutreachMethod = "email" | "linkedin" | "contact_form";

export function resolveOutreachMethod(prospect: Prospect): OutreachMethod {
  if (prospect.contactEmail) return "email";
  if (prospect.linkedinUrl) return "linkedin";
  return "contact_form";
}

interface DraftResult {
  method: OutreachMethod;
  subject: string | null;
  body: string;
}

export async function draftOutreach(prospect: Prospect): Promise<DraftResult> {
  const method = resolveOutreachMethod(prospect);

  const context = `
Company: ${prospect.companyName}
Country: ${prospect.country ?? "Unknown"}
Products they're interested in: ${(prospect.productInterest ?? []).join(", ") || "cocoa products"}
Contact name: ${prospect.contactName ?? "Not available"}
Website: ${prospect.websiteUrl ?? "Not available"}
Outreach method: ${method}
`.trim();

  const prompt =
    method === "email"
      ? `Write a concise, professional outreach email (subject + body) to ${prospect.companyName} about importing cocoa products. Keep it under 200 words. Format: first line is the subject (no "Subject:" prefix), then a blank line, then the body.`
      : method === "linkedin"
      ? `Write a concise LinkedIn connection message (under 300 chars) to someone at ${prospect.companyName} about cocoa product importing opportunities. No subject line needed.`
      : `Write a short contact form message (under 200 words) to ${prospect.companyName} about cocoa product importing opportunities. No subject line needed.`;

  const response = await client.messages.create({
    model: MODELS.drafting,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `${context}\n\n${prompt}`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  if (method === "email") {
    const lines = text.split("\n");
    const subject = lines[0].trim();
    const body = lines.slice(2).join("\n").trim();
    return { method, subject, body };
  }

  return { method, subject: null, body: text };
}
