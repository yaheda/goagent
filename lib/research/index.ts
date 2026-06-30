import type { ResearchProvider } from "./provider";
import { PerplexityProvider } from "./perplexity";
import { WebSearchProvider } from "./websearch";

export function getResearchProvider(): ResearchProvider {
  const name = process.env.RESEARCH_PROVIDER ?? "perplexity";
  if (name === "web_search") return new WebSearchProvider();
  return new PerplexityProvider();
}
