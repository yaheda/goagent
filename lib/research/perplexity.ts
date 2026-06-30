import type { ResearchProvider, Filters, CandidateProspect } from "./provider";

const SYSTEM_PROMPT = `You are a business development research assistant specializing in finding import/export prospects.
Given a search query and optional filters, use your knowledge and real-time web access to find companies that are potential buyers or importers of the specified commodities.
For each prospect found, extract:
- Company name
- Country
- Product interests (what commodities they import/buy)
- Website URL
- LinkedIn company URL (if found)
- Contact form URL (if found)
- Contact name and email (if found on public pages)
- A match score from 0-100 indicating how well they match the query
- A brief snippet explaining why they are a good match

Return results as a JSON array. Each item must have: companyName, country, productInterest (array of strings), websiteUrl, linkedinUrl, contactFormUrl, contactName, contactEmail, matchScore, source ("perplexity"), snippet.
If a field is not found, use null. Always return valid JSON only, no markdown fences.`;

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class PerplexityProvider implements ResearchProvider {
  async search(query: string, filters: Filters): Promise<CandidateProspect[]> {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) throw new Error("PERPLEXITY_API_KEY is not set");

    const filterDesc =
      [
        filters.products?.length ? `Products: ${filters.products.join(", ")}` : null,
        filters.regions?.length ? `Regions: ${filters.regions.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(". ") || "No additional filters.";

    const userMessage = `Research query: "${query}"\nFilters: ${filterDesc}\n\nFind 5-8 relevant import/export prospects. Return JSON array only.`;

    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Perplexity API error ${res.status}: ${text}`);
    }

    const data: PerplexityResponse = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    try {
      const parsed = JSON.parse(content.trim());
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return [];
        }
      }
      return [];
    }
  }
}
