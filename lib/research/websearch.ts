import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import type { ResearchProvider, Filters, CandidateProspect } from "./provider";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a business development research assistant specializing in finding import/export prospects.
Given a search query and optional filters, use web search to find companies that are potential buyers or importers of the specified commodities.
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

Return results as a JSON array. Each item must have: companyName, country, productInterest (array of strings), websiteUrl, linkedinUrl, contactFormUrl, contactName, contactEmail, matchScore, source ("web_search"), snippet.
If a field is not found, use null. Always return valid JSON only, no markdown.`;

export class WebSearchProvider implements ResearchProvider {
  async search(query: string, filters: Filters): Promise<CandidateProspect[]> {
    const filterDesc =
      [
        filters.products?.length ? `Products: ${filters.products.join(", ")}` : null,
        filters.regions?.length ? `Regions: ${filters.regions.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(". ") || "No additional filters.";

    const userMessage = `Research query: "${query}"\nFilters: ${filterDesc}\n\nFind 5-8 relevant import/export prospects. Return JSON array only.`;

    const response = (await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: "web_search_20250305", name: "web_search" }] as any,
      messages: [{ role: "user", content: userMessage }],
    })) as Message;

    // Extract the final text block from the response
    const textBlock = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("");

    try {
      const parsed = JSON.parse(textBlock.trim());
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Try to extract JSON array from the text if it's embedded
      const match = textBlock.match(/\[[\s\S]*\]/);
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
